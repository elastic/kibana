/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilePicker,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionWrapper } from '../../../common/components/section_wrapper';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { runInstallPackage, type RequestDeps } from '../../../common/lib/api';
import type { InstallPackageResponse } from '../../../../common';
import type { SetIntegrationName, SetPage } from '../../types';
import * as i18n from './translations';

interface CreateIntegrationUploadProps {
  setPage: SetPage;
  setIntegrationName: SetIntegrationName;
}

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

export const CreateIntegrationUpload = React.memo<CreateIntegrationUploadProps>(
  ({ setPage, setIntegrationName }) => {
    const { http, notifications } = useKibana().services;
    const [file, setFile] = useState<Blob>();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const onBack = useCallback(() => {
      setPage('landing');
    }, [setPage]);

    const onChangeFile = useCallback((files: FileList | null) => {
      setFile(files?.[0]);
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

          const integrationName = getIntegrationNameFromResponse(response);
          if (integrationName) {
            setIntegrationName(integrationName);
            setPage('success');
          }
        } catch (e) {
          if (!abortController.signal.aborted) {
            notifications?.toasts.addError(e, { title: i18n.UPLOAD_ERROR });
          }
        } finally {
          setIsLoading(false);
        }
      })();
    }, [file, http, setPage, setIntegrationName, notifications?.toasts]);

    return (
      <KibanaPageTemplate>
        <IntegrationImageHeader />
        <SectionWrapper title={i18n.UPLOAD_TITLE} subtitle={<DocsLinkSubtitle />}>
          <EuiFlexGroup direction="row" alignItems="center" justifyContent="center" gutterSize="xl">
            <EuiFlexItem>
              <EuiFilePicker
                id="logsSampleFilePicker"
                initialPromptText={i18n.UPLOAD_INPUT_TEXT}
                onChange={onChangeFile}
                display="large"
                aria-label="Upload .zip file"
                accept="application/x-zip-compressed"
                isLoading={isLoading}
                fullWidth
              />
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SectionWrapper>
        <ButtonsFooter
          isNextDisabled={file == null}
          nextButtonText={i18n.INSTALL_BUTTON}
          onBack={onBack}
          onNext={onConfirm}
        />
      </KibanaPageTemplate>
    );
  }
);
CreateIntegrationUpload.displayName = 'CreateIntegrationUpload';

const DocsLinkSubtitle = React.memo(() => {
  const { docLinks } = useKibana().services;
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="xpack.integrationAssistant.createIntegrationUpload.uploadHelpText"
        defaultMessage="Have some issues? Please read the {link}"
        values={{
          link: (
            <EuiLink
              href={docLinks?.links.fleet.installAndUninstallIntegrationAssets} // TODO: Update the docs link to the correct place
              target="_blank"
            >
              <FormattedMessage
                id="xpack.integrationAssistant.createIntegrationUpload.documentation"
                defaultMessage="documentation"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
});
DocsLinkSubtitle.displayName = 'DocsLinkSubtitle';
