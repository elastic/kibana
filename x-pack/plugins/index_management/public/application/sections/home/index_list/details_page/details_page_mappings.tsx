/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { useLoadIndexMappings, documentationService } from '../../../../services';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';

export const DetailsPageMappings: FunctionComponent<{ indexName: string }> = ({ indexName }) => {
  const { isLoading, data, error, resendRequest } = useLoadIndexMappings(indexName);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indexDetailsMappings);
  }, []);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.mappings.loadingDescription"
          defaultMessage="Loading index mappings…"
        />
      </SectionLoading>
    );
  }
  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsMappingsError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.errorTitle"
              defaultMessage="Unable to load index mappings"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.errorDescription"
                defaultMessage="We encountered an error loading mappings for index {indexName}. Make sure that the index name in the URL is correct and try again."
                values={{
                  indexName,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={resendRequest}
              iconType="refresh"
              color="danger"
              data-test-subj="indexDetailsMappingsReloadButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }

  return (
    // using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen
    <EuiFlexGroup
      wrap
      direction="rowReverse"
      css={css`
        height: 100%;
      `}
    >
      <EuiFlexItem
        grow={1}
        css={css`
          min-width: 400px;
        `}
      >
        <EuiPanel grow={false} paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.docsCardTitle"
                    defaultMessage="About index mappings"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.docsCardDescription"
                defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type
              (such as keyword, number, or date) and additional subfields. These index mappings determine the functions
              available in your relevance tuning and search experience."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiLink
            data-test-subj="indexDetailsMappingsDocsLink"
            href={documentationService.getMappingDocumentationLink()}
            target="_blank"
            external
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.docsCardLink"
              defaultMessage="Learn more about mappings"
            />
          </EuiLink>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem
        grow={3}
        css={css`
          min-width: 600px;
        `}
      >
        <EuiPanel>
          <EuiCodeBlock
            language="json"
            isCopyable
            data-test-subj="indexDetailsMappingsCodeBlock"
            css={css`
              height: 100%;
            `}
          >
            {JSON.stringify(data, null, 2)}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
