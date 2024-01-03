/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { ReactNode, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import {
  EuiFlyout,
  EuiButton,
  EuiCodeBlock,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiFlyoutBody,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiAccordion,
  EuiButtonIcon,
} from '@elastic/eui';
import {
  INGEST_PIPELINES_APP_LOCATOR,
  INGEST_PIPELINES_PAGES,
  IngestPipelinesListParams,
} from '@kbn/ingest-pipelines-plugin/public';
import { SloInspectPortalProps } from './inspect_slo_portal';
import { ObservabilityPublicPluginsStart } from '../../../..';
import { useInspectSlo } from '../../../../hooks/slo/use_inspect_slo';
import { transformCreateSLOFormToCreateSLOInput } from '../../helpers/process_slo_form_values';
import { enableInspectEsQueries } from '../../../../../common';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

export function SLOInspectWrapper(props: SloInspectPortalProps) {
  const {
    services: { uiSettings },
  } = useKibana();

  const { isDev } = usePluginContext();

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  return isDev || isInspectorEnabled ? <SLOInspect {...props} /> : null;
}

function SLOInspect({ getValues, trigger, slo }: SloInspectPortalProps) {
  const { share, http } = useKibana<ObservabilityPublicPluginsStart>().services;
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { mutateAsync: inspectSlo, data, isLoading } = useInspectSlo();

  const { data: sloData } = useFetcher(async () => {
    if (!isFlyoutVisible) {
      return;
    }
    const isValid = await trigger();
    if (!isValid) {
      return;
    }
    const sloForm = transformCreateSLOFormToCreateSLOInput(getValues());
    inspectSlo({ slo: { ...sloForm, id: slo?.id, revision: slo?.revision } });
    return sloForm;
  }, [isFlyoutVisible, trigger, getValues, inspectSlo, slo]);

  const { data: pipeLineUrl } = useFetcher(async () => {
    const ingestPipeLocator = share.url.locators.get<IngestPipelinesListParams>(
      INGEST_PIPELINES_APP_LOCATOR
    );
    const ingestPipeLineId = data?.pipeline?.id;
    return ingestPipeLocator?.getUrl({
      pipelineId: ingestPipeLineId,
      page: INGEST_PIPELINES_PAGES.LIST,
    });
  }, [data?.pipeline?.id, share.url.locators]);

  const closeFlyout = () => {
    setIsFlyoutVisible(false);
    setIsInspecting(false);
  };

  const [isInspecting, setIsInspecting] = useState(false);
  const onButtonClick = () => {
    trigger().then((isValid) => {
      if (isValid) {
        setIsInspecting(() => !isInspecting);
        setIsFlyoutVisible(() => !isFlyoutVisible);
      }
    });
  };

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">{CONFIG_LABEL}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading && <LoadingState />}
          <EuiSpacer size="m" />
          {data && (
            <>
              <CodeBlockAccordion
                id="slo"
                label={i18n.translate(
                  'xpack.observability.sLOInspect.codeBlockAccordion.sloConfigurationLabel',
                  { defaultMessage: 'SLO configuration' }
                )}
                json={data.slo}
              />
              <EuiSpacer size="s" />
              <CodeBlockAccordion
                id="rollUpTransform"
                label={i18n.translate(
                  'xpack.observability.sLOInspect.codeBlockAccordion.rollupTransformLabel',
                  { defaultMessage: 'Rollup transform' }
                )}
                json={data.rollUpTransform}
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
                  'xpack.observability.sLOInspect.codeBlockAccordion.summaryTransformLabel',
                  { defaultMessage: 'Summary transform' }
                )}
                json={data.summaryTransform}
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
                  'xpack.observability.sLOInspect.codeBlockAccordion.ingestPipelineLabel',
                  { defaultMessage: 'SLO Ingest pipeline' }
                )}
                extraAction={
                  <EuiButtonIcon
                    iconType="link"
                    data-test-subj="o11ySLOInspectDetailsButton"
                    href={pipeLineUrl}
                  />
                }
                json={data.pipeline}
              />
              <EuiSpacer size="s" />

              <CodeBlockAccordion
                id="temporaryDoc"
                label={i18n.translate(
                  'xpack.observability.sLOInspect.codeBlockAccordion.temporaryDocumentLabel',
                  { defaultMessage: 'Temporary document' }
                )}
                json={data.temporaryDoc}
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
            {i18n.translate('xpack.observability.sLOInspect.closeButtonLabel', {
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
        content={sloData ? VIEW_FORMATTED_CONFIG_LABEL : VALID_CONFIG_LABEL}
        repositionOnScroll
      >
        <EuiButton
          data-test-subj="syntheticsMonitorInspectShowFlyoutExampleButton"
          onClick={onButtonClick}
          iconType="inspect"
          iconSide="left"
        >
          {SLO_INSPECT_LABEL}
        </EuiButton>
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

const SLO_INSPECT_LABEL = i18n.translate('xpack.observability.sLOInspect.sLOInspectButtonLabel', {
  defaultMessage: 'SLO Inspect',
});

const VIEW_FORMATTED_CONFIG_LABEL = i18n.translate(
  'xpack.observability.slo.viewFormattedResourcesConfigsButtonLabel',
  { defaultMessage: 'View formatted resources configs for SLO' }
);

const VALID_CONFIG_LABEL = i18n.translate('xpack.observability.slo.formattedConfigLabel.valid', {
  defaultMessage: 'Only valid form configurations can be inspected.',
});

const CONFIG_LABEL = i18n.translate('xpack.observability.monitorInspect.configLabel', {
  defaultMessage: 'SLO Configurations',
});
