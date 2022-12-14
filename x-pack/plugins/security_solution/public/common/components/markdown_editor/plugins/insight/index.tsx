/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import type { Plugin } from 'unified';
import React, { useContext, useMemo, useCallback } from 'react';
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
} from '@elastic/eui';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useForm, FormProvider } from 'react-hook-form';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import { useKibana } from '../../../../lib/kibana';
import { useInsightQuery } from './use_insight_query';
import { useInsightDataProviders } from './use_insight_data_providers';
import { BasicAlertDataContext } from '../../../event_details/investigation_guide_view';
import { InvestigateInTimelineButton } from '../../../event_details/table/investigate_in_timeline_button';
import { getTimeRangeSettings } from '../../../../utils/default_date_settings';
import type { TimeRange } from '../../../../store/inputs/model';
import { InsightBuilderForm } from './builder_form';

interface InsightComponentProps {
  label?: string;
  description?: string;
  providers?: string;
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

// receives the configuration from the parser and renders
const InsightComponent = ({ label, description, providers }: InsightComponentProps) => {
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
  const dataProviders = useInsightDataProviders({
    providers: parsedProviders,
    alertData,
  });
  const { totalCount, isQueryLoading, oldestTimestamp, hasError } = useInsightQuery({
    dataProviders,
  });
  const timerange: TimeRange = useMemo(() => {
    if (oldestTimestamp != null) {
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
  }, [oldestTimestamp]);
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
}: EuiMarkdownEditorUiPluginEditorProps<{
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
  };
}>) => {
  const isEditMode = node != null;
  const { osquery } = useKibana().services;
  const formMethods = useForm<{
    label: string;
    query: string;
    ecs_mapping: Record<string, unknown>;
  }>({
    defaultValues: {
      label: node?.configuration?.label,
      query: node?.configuration?.query,
      ecs_mapping: node?.configuration?.ecs_mapping,
    },
  });

  const onSubmit = useCallback(
    (data) => {
      onSave(
        `!{insight${JSON.stringify(
          pickBy(
            {
              query: data.query,
              label: data.label,
              ecs_mapping: data.ecs_mapping,
            },
            (value) => !isEmpty(value)
          )
        )}}`,
        {
          block: true,
        }
      );
    },
    [onSave]
  );

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.editModalTitle"
              defaultMessage="Edit query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.addModalTitle"
              defaultMessage="Add query"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormProvider {...formMethods}>
          <InsightBuilderForm fields={['idk']} formMethods={formMethods} />
        </FormProvider>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.securitySolution.markdown.osquery.modalCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.addModalConfirmButtonLabel"
              defaultMessage="Add query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.editModalConfirmButtonLabel"
              defaultMessage="Save changes"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

const InsightEditor = React.memo(InsightEditorComponent);

export const plugin = {
  name: 'insights',
  button: {
    label: 'Insights',
    iconType: 'aggregate',
  },
  helpText: (
    <div>
      <EuiCodeBlock language="md" fontSize="l" paddingSize="s" isCopyable>
        {'!{insight{#TODO}}'}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
    </div>
  ),
  editor: InsightEditor,
};
