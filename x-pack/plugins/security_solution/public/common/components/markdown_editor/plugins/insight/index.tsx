/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import type { Plugin } from 'unified';
import moment from 'moment';
import React, { useContext, useMemo, useCallback, useState } from 'react';
import type { RemarkTokenizer } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiIcon,
  EuiSpacer,
  EuiBetaBadge,
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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { css } from '@emotion/react';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
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
import { filtersToInsightProviders } from './provider';
import * as i18n from './translations';

interface InsightComponentProps {
  label?: string;
  description?: string;
  providers?: string;
  relativeFrom?: string;
  relativeTo?: string;
}

const insightPrefix = '!{investigate';

export const parser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

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
        this.file.fail(i18n.INVALID_FILTER_ERROR(err), {
          line: now.line,
          column: now.column + insightPrefix.length,
        });
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

const resultFormat = '0,0.[000]a';

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
      title: i18n.PARSE_ERROR,
    });
  }
  const { data: alertData, timestamp } = useContext(BasicAlertDataContext);
  const { dataProviders, filters } = useInsightDataProviders({
    providers: parsedProviders,
    alertData,
  });
  const relativeTimerange: TimeRange | null = useMemo(() => {
    if (relativeFrom && relativeTo) {
      const alertRelativeDate = timestamp ? moment(timestamp) : moment();
      const from = parseDateWithDefault(
        relativeFrom,
        DEFAULT_FROM_MOMENT,
        false,
        moment,
        alertRelativeDate.toDate()
      ).toISOString();
      const to = parseDateWithDefault(
        relativeTo,
        DEFAULT_TO_MOMENT,
        true,
        moment,
        alertRelativeDate.toDate()
      ).toISOString();
      return {
        kind: 'absolute',
        from,
        to,
      };
    } else {
      return null;
    }
  }, [relativeFrom, relativeTo, timestamp]);

  const { totalCount, isQueryLoading, oldestTimestamp, hasError } = useInsightQuery({
    dataProviders,
    filters,
    relativeTimerange,
  });
  const timerange: TimeRange = useMemo(() => {
    if (relativeTimerange) {
      return relativeTimerange;
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
  }, [oldestTimestamp, relativeTimerange]);

  if (isQueryLoading) {
    return <EuiLoadingSpinner size="l" />;
  } else {
    return (
      <>
        <InvestigateInTimelineButton
          asEmptyButton={false}
          isDisabled={hasError}
          dataProviders={dataProviders}
          filters={filters}
          timeRange={timerange}
          keepDataView={true}
          data-test-subj="insight-investigate-in-timeline-button"
        >
          <EuiIcon type="timeline" />
          {` ${label} (${numeral(totalCount).format(resultFormat)})`}
        </InvestigateInTimelineButton>
        <div>{description}</div>
      </>
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
          value: String(index),
          text: display,
        };
      }),
    ];
  }, [uiSettings]);
  const kibanaDataProvider = useMemo(() => {
    return {
      ...sourcererDataView,
      fields: sourcererDataView?.indexFields,
    } as DataView;
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
    shouldUnregister: true,
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

  const onSubmit = useCallback(() => {
    onSave(
      `${insightPrefix}${JSON.stringify(
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
  }, [
    onSave,
    providers,
    labelController.field.value,
    descriptionController.field.value,
    relativeTimerangeController.field.value,
    getTimeRangeSelection,
  ]);

  const onChange = useCallback((filters: Filter[]) => {
    setProviders(filtersToInsightProviders(filters));
  }, []);
  const selectOnChange = useCallback(
    (event) => {
      relativeTimerangeController.field.onChange(event.target.value);
    },
    [relativeTimerangeController.field]
  );
  const disableSubmit = useMemo(() => {
    const labelOrEmpty = labelController.field.value ? labelController.field.value : '';
    return labelOrEmpty.trim() === '' || providers.length === 0;
  }, [labelController.field.value, providers]);
  const filtersStub = useMemo(() => {
    const index = indexPattern && indexPattern.getName ? indexPattern.getName() : '*';
    return [
      {
        $state: {
          store: FilterStateStore.APP_STATE,
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
          <EuiFlexGroup gutterSize={'s'}>
            <EuiFlexItem>
              {isEditMode ? (
                <FormattedMessage
                  id="xpack.securitySolution.markdown.insight.editModalTitle"
                  defaultMessage="Edit investigation query"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.markdown.insight.addModalTitle"
                  defaultMessage="Add investigation query"
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge color={'hollow'} label={i18n.TECH_PREVIEW} size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormProvider {...formMethods}>
          <EuiForm fullWidth>
            <EuiFormRow label={i18n.FORM_DESCRIPTION} fullWidth>
              <></>
            </EuiFormRow>
            <EuiFormRow
              label={i18n.LABEL}
              helpText={i18n.LABEL_TEXT}
              isInvalid={labelController.field.value != null}
              fullWidth
            >
              <EuiFieldText
                {...{
                  ...formMethods.register('label'),
                  ref: null,
                }}
                name="label"
                onChange={labelController.field.onChange}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.DESCRIPTION} helpText={i18n.DESCRIPTION_TEXT} fullWidth>
              <EuiFieldText
                {...{ ...formMethods.register('description'), ref: null }}
                name="description"
                onChange={descriptionController.field.onChange}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.FILTER_BUILDER} helpText={i18n.FILTER_BUILDER_TEXT} fullWidth>
              <FiltersBuilderLazy
                filters={filtersStub}
                onChange={onChange}
                dataView={kibanaDataProvider}
                maxDepth={2}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.RELATIVE_TIMERANGE}
              helpText={i18n.RELATIVE_TIMERANGE_TEXT}
              fullWidth
            >
              <EuiSelect
                {...{ ...formMethods.register('relativeTimerange'), ref: null }}
                onChange={selectOnChange}
                options={dateRangeChoices}
              />
            </EuiFormRow>
          </EuiForm>
        </FormProvider>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL_FORM_BUTTON}</EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill disabled={disableSubmit}>
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
const exampleInsight = `${insightPrefix}
  "label": "Test action",
  "description": "Click to investigate",
  "providers": [
    [     
      {"field": "event.id", "value": "{{kibana.alert.original_event.id}}", "queryType": "phrase", "excluded": "false"}
    ],
    [  
      {"field": "event.action", "value": "", "queryType": "exists", "excluded": "false"},
      {"field": "process.pid", "value": "{{process.pid}}", "queryType": "phrase", "excluded":"false"}
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
