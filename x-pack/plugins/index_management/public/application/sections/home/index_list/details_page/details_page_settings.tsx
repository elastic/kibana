/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
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
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitchEvent } from '@elastic/eui/src/components/form/switch/switch';
import { documentationService, useLoadIndexSettings } from '../../../../services';

export const DetailsPageSettings: FunctionComponent<RouteComponentProps<{ indexName: string }>> = ({
  match: {
    params: { indexName },
  },
}) => {
  const { isLoading, data, error, resendRequest } = useLoadIndexSettings(indexName);
  const [isEditMode, setIsEditMode] = useState(false);
  const onEditModeChange = (event: EuiSwitchEvent) => {
    setIsEditMode(event.target.checked);
  };

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.settings.loadingDescription"
          defaultMessage="Loading index settings…"
        />
      </SectionLoading>
    );
  }
  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsSettingsError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.settings.errorTitle"
              defaultMessage="Unable to load index settings"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.errorDescription"
                defaultMessage="There was an error loading settings for index {indexName}: {error}"
                values={{
                  indexName,
                  error: error.error,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={resendRequest}
              iconType="refresh"
              color="danger"
              data-test-subj="indexDetailsSettingsReloadButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }
  return (
    // using "rowReverse" to keep the card on the left side to be on top of the code block on smaller screens
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
              <EuiIcon type="pencil" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <b>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.settings.docsCardTitle"
                    defaultMessage="Index settings"
                  />
                </b>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.editModeSwitchLabel"
                defaultMessage="Edit mode"
              />
            }
            checked={isEditMode}
            onChange={onEditModeChange}
          />
          <EuiSpacer size="m" />
          <EuiButton fill isDisabled={!isEditMode}>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.settings.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
          <EuiSpacer size="m" />
          <EuiLink
            data-test-subj="indexDetailsSettingsDocsLink"
            href={documentationService.getSettingsDocumentationLink()}
            target="_blank"
            external
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.settings.docsCardLink"
              defaultMessage="Settings reference"
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
          {isEditMode ? (
            <span>edit mode</span>
          ) : (
            <EuiCodeBlock
              language="json"
              isCopyable
              data-test-subj="indexDetailsSettingsCodeBlock"
              css={css`
                height: 100%;
              `}
            >
              {JSON.stringify(data, null, 2)}
            </EuiCodeBlock>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
