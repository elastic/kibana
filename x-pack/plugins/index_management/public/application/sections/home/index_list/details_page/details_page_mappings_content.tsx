/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { Index } from '../../../../../../common';
import { documentationService } from '../../../../services';
import { useAppContext } from '../../../../app_context';

export const DetailsPageMappingsContent: FunctionComponent<{ index: Index; data: string }> = ({
  index,
  data,
}) => {
  const {
    services: { extensionsService },
    core: { getUrlForApp },
  } = useAppContext();
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
        {extensionsService.indexMappingsContent && (
          <>
            <EuiSpacer />
            {extensionsService.indexMappingsContent.renderContent({ index, getUrlForApp })}
          </>
        )}
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
            {data}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
