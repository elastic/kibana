/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFilePicker, EuiSpacer, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SuccessSection } from '../../../common/components/success_section';
import { SectionWrapper } from '../../../common/components/section_wrapper';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { runInstallPackage, type RequestDeps } from '../../../common/lib/api';
import type { InstallPackageResponse } from '../../../../common';
import type { SetPage } from '../../types';
import { DocsLinkSubtitle } from './docs_link_subtitle';
import * as i18n from './translations';

/**
 * This is a hacky way to get the integration name from the response.
 * Since the integration name is not returned in the response we have to parse it from the ingest pipeline name.
 * TODO: Return the package name from the fleet API.
 */
const getIntegrationNameFromResponse = (response: InstallPackageResponse) => {
  const ingestPipelineName = response.response?.[0]?.id;
  if (ingestPipelineName) {
    const match = ingestPipelineName.match(/^.*-([a-z_]+)\..*-([\d\.]+)$/);
    const integrationName = match?.at(1);
    const version = match?.at(2);
    if (integrationName && version) {
      return `${integrationName}-${version}`;
    }
  }
  return '';
};

interface CreateIntegrationUploadProps {
  setPage: SetPage;
}
export const CreateIntegrationUpload = React.memo<CreateIntegrationUploadProps>(({ setPage }) => {
  const { http } = useKibana().services;
  const [file, setFile] = useState<Blob>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [integrationName, setIntegrationName] = useState<string>();

  const onBack = useCallback(() => {
    setPage('landing');
  }, [setPage]);

  const onChangeFile = useCallback((files: FileList | null) => {
    setFile(files?.[0]);
    setError(undefined);
  }, []);

  const onConfirm = useCallback(() => {
    if (http == null || file == null) {
      return;
    }
    setIsLoading(true);
    const abortController = new AbortController();
    (async () => {
      try {
        const deps: RequestDeps = { http, abortSignal: abortController.signal };
        const response = await runInstallPackage(file, deps);

        const integrationNameFromResponse = getIntegrationNameFromResponse(response);
        if (integrationNameFromResponse) {
          setIntegrationName(integrationNameFromResponse);
        } else {
          throw new Error('Integration name not found in response');
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(`${i18n.UPLOAD_ERROR}: ${e.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [file, http, setIntegrationName, setError]);

  return (
    <KibanaPageTemplate>
      <IntegrationImageHeader />
      {integrationName ? (
        <>
          <KibanaPageTemplate.Section grow>
            <SuccessSection integrationName={integrationName} />
          </KibanaPageTemplate.Section>
          <ButtonsFooter cancelButtonText={i18n.CLOSE_BUTTON} />
        </>
      ) : (
        <>
          <KibanaPageTemplate.Section grow>
            <SectionWrapper title={i18n.UPLOAD_TITLE} subtitle={<DocsLinkSubtitle />}>
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="center"
                gutterSize="xl"
              >
                <EuiFlexItem>
                  <EuiFilePicker
                    id="logsSampleFilePicker"
                    initialPromptText={i18n.UPLOAD_INPUT_TEXT}
                    onChange={onChangeFile}
                    display="large"
                    aria-label="Upload .zip file"
                    accept="application/zip"
                    isLoading={isLoading}
                    fullWidth
                    isInvalid={error != null}
                  />
                  <EuiSpacer size="xs" />
                  {error && (
                    <EuiText color="danger" size="xs">
                      {error}
                    </EuiText>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </SectionWrapper>
          </KibanaPageTemplate.Section>
          <ButtonsFooter
            isNextDisabled={file == null}
            nextButtonText={i18n.INSTALL_BUTTON}
            onBack={onBack}
            onNext={onConfirm}
          />
        </>
      )}
    </KibanaPageTemplate>
  );
});
CreateIntegrationUpload.displayName = 'CreateIntegrationUpload';
