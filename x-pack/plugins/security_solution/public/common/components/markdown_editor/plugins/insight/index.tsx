/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import type { Plugin } from 'unified';
import React, { useContext, useMemo, useCallback, useState } from 'react';
import type { RemarkTokenizer } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiIcon,
  EuiSpacer,
  EuiCodeBlock,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import {
  FILTERS,
  isCombinedFilter,
  isRangeFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isExistsFilter,
  BooleanRelation,
} from '@kbn/es-query';
import { useForm, FormProvider, useController } from 'react-hook-form';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import { useKibana } from '../../../../lib/kibana';
import { useInsightQuery } from './use_insight_query';
import { useInsightDataProviders, type Provider } from './use_insight_data_providers';
import { BasicAlertDataContext } from '../../../event_details/investigation_guide_view';
import { InvestigateInTimelineButton } from '../../../event_details/table/investigate_in_timeline_button';
import {
  getTimeRangeSettings,
  parseDateWithDefault,
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../../utils/default_date_settings';
import type { TimeRange } from '../../../../store/inputs/model';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../../../common/constants';
import { useSourcererDataView } from '../../../../containers/sourcerer';
import { SourcererScopeName } from '../../../../store/sourcerer/model';

interface InsightComponentProps {
  label?: string;
  description?: string;
  providers?: string;
  relativeFrom?: string;
  relativeTo?: string;
}

export const parser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;
  const insightPrefix = '!{insight';

  const tokenizeInsight: RemarkTokenizer = function (eat, value, silent) {
    if (value.startsWith(insightPrefix) === false) {
      return false;
    }

    const nextChar = value[insightPrefix.length];
    if (nextChar !== '{' && nextChar !== '}') return false;
    if (silent) {
      return true;
    }

    // is there a configuration?
    const hasConfiguration = nextChar === '{';

    let configuration: InsightComponentProps = {};
    if (hasConfiguration) {
      let configurationString = '';
      let openObjects = 0;

      for (let i = insightPrefix.length; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          configurationString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          configurationString += char;
        } else {
          configurationString += char;
        }
      }

      try {
        configuration = JSON.parse(configurationString);
        return eat(value)({
          type: 'insight',
          ...configuration,
          providers: JSON.stringify(configuration.providers),
        });
      } catch (err) {
        const now = eat.now();
        this.file.fail(
          i18n.translate('xpack.securitySolution.markdownEditor.plugins.insightConfigError', {
            values: { err },
            defaultMessage: 'Unable to parse insight JSON configuration: {err}',
          }),
          {
            line: now.line,
            column: now.column + insightPrefix.length,
          }
        );
      }
    }
    return false;
  };
  tokenizeInsight.locator = (value: string, fromIndex: number) => {
    return value.indexOf(insightPrefix, fromIndex);
  };
  tokenizers.insight = tokenizeInsight;
  methods.splice(methods.indexOf('text'), 0, 'insight');
};

const buildPrimitiveFilter = (filter: Filter): Provider => {
  const field = filter.meta?.key ?? '';
  const excluded = filter.meta?.negate ?? false;
  const queryType = filter.meta?.type ?? FILTERS.PHRASE;
  const baseFilter = {
    field,
    excluded,
    queryType,
  };
  if (isRangeFilter(filter)) {
    const gte = filter.query.range[field].gte;
    const lt = filter.query.range[field].lt;
    const value = JSON.stringify({ gte, lt });
    return {
      ...baseFilter,
      value,
      queryType: filter.meta.type ?? FILTERS.RANGE,
    };
  } else if (isPhrasesFilter(filter)) {
    return {
      ...baseFilter,
      value: filter.meta?.params.join(',') ?? [],
      queryType: filter.meta.type ?? FILTERS.PHRASES,
    };
  } else if (isExistsFilter(filter)) {
    return {
      ...baseFilter,
      value: '',
      queryType: filter.meta.type ?? FILTERS.EXISTS,
    };
  } else if (isPhraseFilter(filter)) {
    return {
      ...baseFilter,
      value: filter.meta?.params?.query ?? '',
      queryType: filter.meta.type ?? FILTERS.PHRASE,
    };
  } else {
    return {
      ...baseFilter,
      value: '',
      queryType: FILTERS.PHRASE,
    };
  }
};

const filtersToInsightProviders = (filters: Filter[]): Provider[][] => {
  const providers = [];
  for (let index = 0; index < filters.length; index++) {
    const filter = filters[index];
    if (isCombinedFilter(filter)) {
      if (filter.meta.relation === BooleanRelation.AND) {
        return filtersToInsightProviders(filter.meta?.params);
      } else {
        return filter.meta?.params.map((innerFilter) => {
          if (isCombinedFilter(innerFilter)) {
            return filtersToInsightProviders([innerFilter]).map(([provider]) => provider);
          } else {
            return [buildPrimitiveFilter(innerFilter)];
          }
        });
      }
    } else {
      providers.push([buildPrimitiveFilter(filter)]);
    }
  }
  return providers;
};

// receives the configuration from the parser and renders
const InsightComponent = ({
  label,
  description,
  providers,
  relativeFrom,
  relativeTo,
}: InsightComponentProps) => {
  const { addError } = useAppToasts();
  let parsedProviders = [];
  try {
    if (providers !== undefined) {
      parsedProviders = JSON.parse(providers);
    }
  } catch (err) {
    addError(err, {
      title: i18n.translate('xpack.securitySolution.markdownEditor.plugins.insightProviderError', {
        defaultMessage: 'Unable to parse insight provider configuration',
      }),
    });
  }
  const { data: alertData } = useContext(BasicAlertDataContext);
  const { dataProviders, filters } = useInsightDataProviders({
    providers: parsedProviders,
    alertData,
  });
  const { totalCount, isQueryLoading, oldestTimestamp, hasError } = useInsightQuery({
    dataProviders,
    filters,
  });
  const timerange: TimeRange = useMemo(() => {
    if (relativeFrom && relativeTo) {
      const fromStr = relativeFrom;
      const toStr = relativeTo;
      const from = parseDateWithDefault(fromStr, DEFAULT_FROM_MOMENT).toISOString();
      const to = parseDateWithDefault(toStr, DEFAULT_TO_MOMENT, true).toISOString();
      return {
        kind: 'relative',
        from,
        to,
        fromStr,
        toStr,
      };
    } else if (oldestTimestamp != null) {
      return {
        kind: 'absolute',
        from: oldestTimestamp,
        to: new Date().toISOString(),
      };
    } else {
      const { to, from, fromStr, toStr } = getTimeRangeSettings();
      return {
        kind: 'relative',
        to,
        from,
        fromStr,
        toStr,
      };
    }
  }, [oldestTimestamp, relativeFrom, relativeTo]);
  if (isQueryLoading) {
    return <EuiLoadingSpinner size="l" />;
  } else {
    return (
      <InvestigateInTimelineButton
        asEmptyButton={false}
        isDisabled={hasError}
        dataProviders={dataProviders}
        timeRange={timerange}
        keepDataView={true}
        data-test-subj="insight-investigate-in-timeline-button"
      >
        <EuiIcon type="timeline" />
        {` ${label} (${totalCount}) - ${description}`}
      </InvestigateInTimelineButton>
    );
  }
};

export { InsightComponent as renderer };

const InsightEditorComponent = ({
  node,
  onSave,
  onCancel,
}: EuiMarkdownEditorUiPluginEditorProps<InsightComponentProps & { relativeTimerange: string }>) => {
  const isEditMode = node != null;
  const { sourcererDataView, indexPattern } = useSourcererDataView(SourcererScopeName.default);
  const {
    unifiedSearch: {
      ui: { FiltersBuilderLazy },
    },
    uiSettings,
  } = useKibana().services;
  const [providers, setProviders] = useState<Provider[][]>([[]]);
  const dateRangeChoices = useMemo(() => {
    const settings: Array<{ from: string; to: string; display: string }> = uiSettings.get(
      DEFAULT_TIMEPICKER_QUICK_RANGES
    );
    const emptyValue = { value: '0', text: '' };
    return [
      emptyValue,
      ...settings.map(({ display }, index) => {
        return {
          value: String(index + 1),
          text: display,
        };
      }),
    ];
  }, [uiSettings]);
  const kibanaDataProvider = useMemo(() => {
    return {
      ...sourcererDataView,
      fields: sourcererDataView?.indexFields,
    };
  }, [sourcererDataView]);
  const formMethods = useForm<{
    label: string;
    description: string;
    relativeTimerange?: string;
  }>({
    defaultValues: {
      label: node?.label,
      description: node?.description,
      relativeTimerange: node?.relativeTimerange || '0',
    },
  });

  const labelController = useController({ name: 'label', control: formMethods.control });
  const descriptionController = useController({
    name: 'description',
    control: formMethods.control,
  });
  const relativeTimerangeController = useController({
    name: 'relativeTimerange',
    control: formMethods.control,
  });

  const getTimeRangeSelection = useCallback(
    (selection?: string) => {
      const selectedOption = dateRangeChoices.find((option) => {
        return option.value === selection;
      });
      if (selectedOption && selectedOption.value !== '0') {
        const settingsIndex = Number(selectedOption.value);
        const settings: Array<{ from: string; to: string; display: string }> = uiSettings.get(
          DEFAULT_TIMEPICKER_QUICK_RANGES
        );
        return {
          relativeFrom: settings[settingsIndex].from,
          relativeTo: settings[settingsIndex].to,
        };
      } else {
        return {};
      }
    },
    [dateRangeChoices, uiSettings]
  );

  const onSubmit = useCallback(
    (data) => {
      onSave(
        `!{insight${JSON.stringify(
          pickBy(
            {
              label: labelController.field.value,
              description: descriptionController.field.value,
              providers,
              ...getTimeRangeSelection(relativeTimerangeController.field.value),
            },
            (value) => !isEmpty(value)
          )
        )}}`,
        {
          block: true,
        }
      );
    },
    [
      onSave,
      providers,
      labelController.field.value,
      descriptionController.field.value,
      relativeTimerangeController.field.value,
      getTimeRangeSelection,
    ]
  );

  const onChange = useCallback((filters: Filter[]) => {
    setProviders(filtersToInsightProviders(filters));
  }, []);
  const selectOnChange = useCallback(
    (event) => {
      relativeTimerangeController.field.onChange(event.target.value);
    },
    [relativeTimerangeController.field]
  );
  const filtersStub = useMemo(() => {
    const index = indexPattern !== undefined ? indexPattern.getName() : '*';
    return [
      {
        $state: {
          store: 'appState',
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          index,
        },
      },
    ];
  }, [indexPattern]);
  return (
    <>
      <EuiModalHeader
        css={css`
          min-width: 700px;
        `}
      >
        <EuiModalHeaderTitle>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.insight.editModalTitle"
              defaultMessage="Edit insight query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.insight.addModalTitle"
              defaultMessage="Add insight query"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormProvider {...formMethods}>
          <EuiForm>
            <EuiFormRow
              label="Description"
              helpText="Description of the relevance of the query"
              fullWidth
            >
              <EuiFieldText
                {...{ ...formMethods.register('description'), ref: null }}
                name="description"
                onChange={descriptionController.field.onChange}
              />
            </EuiFormRow>
            <EuiFormRow
              label="Label"
              helpText="Label for the filter button rendered in the guide"
              fullWidth
            >
              <EuiFieldText
                {...{ ...formMethods.register('label'), ref: null }}
                name="label"
                onChange={labelController.field.onChange}
              />
            </EuiFormRow>
            <EuiFormRow fullWidth>
              <FiltersBuilderLazy
                filters={filtersStub}
                onChange={onChange}
                dataView={kibanaDataProvider}
                maxDepth={2}
              />
            </EuiFormRow>
            <EuiFormRow
              label="Relative time range to use when building the query (optional)"
              fullWidth
            >
              <EuiSelect
                {...formMethods.register('relativeTimerange')}
                onChange={selectOnChange}
                options={dateRangeChoices}
              />
            </EuiFormRow>
          </EuiForm>
        </FormProvider>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.securitySolution.markdown.insight.modalCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.insight.addModalConfirmButtonLabel"
              defaultMessage="Add query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.insight.editModalConfirmButtonLabel"
              defaultMessage="Save changes"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

const InsightEditor = React.memo(InsightEditorComponent);
const exampleInsight = `!{insight{
  "label": "Test action",
  "description": "Click to investigate",
  "providers": [
    [     
      {"field": "event.id", "value": "kibana.alert.original_event.id", "queryType": "parameter"}
    ],
    [  
      {"field": "event.action", "value": "rename", "type": "literal"},
      {"field": "process.pid", "value": "process.pid", "type": "parameter"}
    ]
  ]
}}`;

export const plugin = {
  name: 'insights',
  button: {
    label: 'Insights',
    iconType: 'aggregate',
  },
  helpText: (
    <div>
      <EuiCodeBlock language="md" fontSize="l" paddingSize="s" isCopyable>
        {exampleInsight}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
    </div>
  ),
  editor: InsightEditor,
};
