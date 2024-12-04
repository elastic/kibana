/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  copyToClipboard,
  EuiAccordion,
  EuiButtonIcon,
  EuiFieldText,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  manualMitigationCustomPipelineCopyPipelineNameAriaText,
  manualMitigationCustomPipelineCreateEditPipelineLink,
  otherMitigationsCustomIngestPipeline,
} from '../../../../../../common/translations';
import { useKibanaContextForPlugin } from '../../../../../utils';
import { useDatasetQualityDetailsState } from '../../../../../hooks';

const AccordionTitle = () => (
  <EuiTitle size="xxs">
    <h6>{otherMitigationsCustomIngestPipeline}</h6>
  </EuiTitle>
);

export function CreateEditPipelineLink({ isIntegration }: { isIntegration: boolean }) {
  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const accordionId = useGeneratedHtmlId({
    prefix: otherMitigationsCustomIngestPipeline,
  });

  const { datasetDetails } = useDatasetQualityDetailsState();
  const { type, name } = datasetDetails;

  const pipelineName = useMemo(
    () => (isIntegration ? `${type}-${name}@custom` : `${type}@custom`),
    [isIntegration, type, name]
  );

  const ingestPipelineLocator = locators.get('INGEST_PIPELINES_APP_LOCATOR');

  const pipelineUrl = ingestPipelineLocator?.useUrl(
    { pipelineId: pipelineName, page: 'pipelines_list' },
    {},
    [pipelineName]
  );

  const onClickHandler = useCallback(() => {
    copyToClipboard(pipelineName);
  }, [pipelineName]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={<AccordionTitle />}
        paddingSize="none"
        initialIsOpen={true}
        data-test-subj="datasetQualityManualMitigationsPipelineAccordion"
      >
        <EuiHorizontalRule margin="s" />
        <FormattedMessage
          id="xpack.datasetQuality.details.degradedField.possibleMitigation.otherMitigationsCustomPipelineText1"
          defaultMessage="{lineNumber} Copy the following pipeline name"
          values={{
            lineNumber: (
              <strong>
                {i18n.translate('xpack.datasetQuality.editPipeline.strong.Label', {
                  defaultMessage: '1.',
                })}
              </strong>
            ),
          }}
        />
        <EuiSpacer size="m" />
        <EuiFieldText
          append={
            <EuiButtonIcon
              iconType="copy"
              data-test-subj="datasetQualityManualMitigationsPipelineNameCopyButton"
              onClick={onClickHandler}
            />
          }
          readOnly={true}
          aria-label={manualMitigationCustomPipelineCopyPipelineNameAriaText}
          value={pipelineName}
          data-test-subj="datasetQualityManualMitigationsPipelineName"
          fullWidth
        />
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.datasetQuality.details.degradedField.possibleMitigation.otherMitigationsCustomPipelineText2"
          defaultMessage="{lineNumber} Using the name you copied, {createEditPipelineLink}"
          values={{
            lineNumber: (
              <strong>
                {i18n.translate('xpack.datasetQuality.editPipeline.strong.Label', {
                  defaultMessage: '2.',
                })}
              </strong>
            ),
            createEditPipelineLink: (
              <EuiLink
                data-test-subj="datasetQualityManualMitigationsPipelineLink"
                data-test-url={pipelineUrl}
                href={pipelineUrl}
                target="_blank"
              >
                {manualMitigationCustomPipelineCreateEditPipelineLink}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="m" />
      </EuiAccordion>
    </EuiPanel>
  );
}
