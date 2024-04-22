/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  IngestPipelinesListParams,
  INGEST_PIPELINES_APP_LOCATOR,
  INGEST_PIPELINES_PAGES,
} from '@kbn/ingest-pipelines-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { GetSLOResponse } from '@kbn/slo-schema';
import React, { ReactNode, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { useKibana } from '../../../../utils/kibana_react';
import { useFetchSloInspect } from '../../../../hooks/use_fetch_slo_inspect';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { transformCreateSLOFormToCreateSLOInput } from '../../helpers/process_slo_form_values';
import { CreateSLOForm } from '../../types';

interface Props {
  slo?: GetSLOResponse;
  disabled: boolean;
}

export function SLOInspectWrapper({ slo, disabled }: Props) {
  const {
    services: { uiSettings },
  } = useKibana();

  const { isDev } = usePluginContext();
  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  return isDev || isInspectorEnabled ? <SLOInspect slo={slo} disabled={disabled} /> : null;
}

function SLOInspect({ slo, disabled }: Props) {
  const { share, http } = useKibana().services;
  const { trigger, getValues } = useFormContext<CreateSLOForm>();

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isFormValid, setFormValid] = useState(false);

  const sloFormValues = transformCreateSLOFormToCreateSLOInput(getValues());
  const { data: inspectSloData, isLoading } = useFetchSloInspect(
    { ...sloFormValues, id: slo?.id, revision: slo?.revision },
    isFlyoutVisible && isFormValid
  );

  const { data: pipeLineUrl } = useFetcher(async () => {
    const ingestPipeLocator = share.url.locators.get<IngestPipelinesListParams>(
      INGEST_PIPELINES_APP_LOCATOR
    );
    const ingestPipeLineId = inspectSloData?.pipeline?.id;
    return ingestPipeLocator?.getUrl({
      pipelineId: ingestPipeLineId,
      page: INGEST_PIPELINES_PAGES.LIST,
    });
  }, [inspectSloData?.pipeline?.id, share.url.locators]);

  const closeFlyout = () => {
    setIsFlyoutVisible(false);
    setFormValid(false);
  };

  const handleInspectButtonClick = async () => {
    const valid = await trigger();
    if (!valid) {
      setFormValid(false);
      return;
    }

    setFormValid(true);
    setIsFlyoutVisible(true);
  };

  let flyout;
  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              {i18n.translate('xpack.slo.monitorInspect.configLabel', {
                defaultMessage: 'SLO Configurations',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading && <LoadingState />}
          <EuiSpacer size="m" />
          {inspectSloData && (
            <>
              <CodeBlockAccordion
                id="slo"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.sloConfigurationLabel',
                  { defaultMessage: 'SLO configuration' }
                )}
                json={inspectSloData.slo}
              />
              <EuiSpacer size="s" />
              <CodeBlockAccordion
                id="rollUpTransform"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.rollupTransformLabel',
                  { defaultMessage: 'Rollup transform' }
                )}
                json={inspectSloData.rollUpTransform}
                extraAction={
                  <EuiButtonIcon
                    iconType="link"
                    data-test-subj="o11ySLOInspectDetailsButton"
                    href={http?.basePath.prepend('/app/management/data/transform')}
                  />
                }
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="summaryTransform"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.summaryTransformLabel',
                  { defaultMessage: 'Summary transform' }
                )}
                json={inspectSloData.summaryTransform}
                extraAction={
                  <EuiButtonIcon
                    iconType="link"
                    data-test-subj="o11ySLOInspectDetailsButton"
                    href={http?.basePath.prepend('/app/management/data/transform')}
                  />
                }
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="pipeline"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.ingestPipelineLabel',
                  { defaultMessage: 'SLO Ingest pipeline' }
                )}
                extraAction={
                  <EuiButtonIcon
                    iconType="link"
                    data-test-subj="o11ySLOInspectDetailsButton"
                    href={pipeLineUrl}
                  />
                }
                json={inspectSloData.pipeline}
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="temporaryDoc"
                label={i18n.translate(
                  'xpack.slo.sLOInspect.codeBlockAccordion.temporaryDocumentLabel',
                  { defaultMessage: 'Temporary document' }
                )}
                json={inspectSloData.temporaryDoc}
              />
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton
            data-test-subj="syntheticsMonitorInspectCloseButton"
            onClick={closeFlyout}
            fill
          >
            {i18n.translate('xpack.slo.sLOInspect.closeButtonLabel', {
              defaultMessage: 'Close',
            })}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <>
      <EuiToolTip
        content={
          isFormValid
            ? i18n.translate('xpack.slo.viewFormattedResourcesConfigsButtonLabel', {
                defaultMessage: 'View formatted resources configs for SLO',
              })
            : i18n.translate('xpack.slo.formattedConfigLabel.valid', {
                defaultMessage: 'Only valid form configurations can be inspected.',
              })
        }
        repositionOnScroll
      >
        <EuiButtonEmpty
          color="primary"
          data-test-subj="syntheticsMonitorInspectShowFlyoutExampleButton"
          onClick={handleInspectButtonClick}
          disabled={disabled}
          iconType="inspect"
          iconSide="left"
        >
          {i18n.translate('xpack.slo.sLOInspect.sLOInspectButtonLabel', {
            defaultMessage: 'SLO Inspect',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>

      {flyout}
    </>
  );
}

function CodeBlockAccordion({
  id,
  label,
  json,
  extraAction,
}: {
  id: string;
  label: string;
  json: any;
  extraAction?: ReactNode;
}) {
  return (
    <EuiAccordion
      id={id}
      extraAction={extraAction}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{label}</h3>
        </EuiTitle>
      }
    >
      <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable={true}>
        {JSON.stringify(json, null, 2)}
      </EuiCodeBlock>
    </EuiAccordion>
  );
}

export function LoadingState() {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
