/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiEmptyPrompt,
  EuiLink,
  EuiPageContent,
  EuiButton,
  EuiPopover,
  EuiContextMenu,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core/public';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../../shared_imports';
import { getCreateFromCsvPath, getCreatePath } from '../../services/navigation';

export const EmptyList: FunctionComponent = () => {
  const { services } = useKibana();
  const history = useHistory() as ScopedHistory;
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const createMenuItems = [
    {
      name: i18n.translate('xpack.ingestPipelines.list.table.emptyPrompt.createButtonLabel', {
        defaultMessage: 'New pipeline',
      }),
      ...reactRouterNavigate(history, getCreatePath()),
      'data-test-subj': `emptyStateCreatePipelineButton`,
    },
    {
      name: i18n.translate(
        'xpack.ingestPipelines.list.table.emptyPrompt.createButtonLabel.createPipelineFromCsvButtonLabel',
        {
          defaultMessage: 'New pipeline from CSV',
        }
      ),
      ...reactRouterNavigate(history, getCreateFromCsvPath()),
      'data-test-subj': `emptyStatecreatePipelineFromCsvButton`,
    },
  ];

  return (
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
      <EuiEmptyPrompt
        iconType="managementApp"
        data-test-subj="emptyList"
        title={
          <h2 data-test-subj="title">
            {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptTitle', {
              defaultMessage: 'Start by creating a pipeline',
            })}
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.list.table.emptyPromptDescription"
              defaultMessage="Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing."
            />{' '}
            <EuiLink href={services.documentation.getIngestNodeUrl()} target="_blank" external>
              {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptDocumentionLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </p>
        }
        actions={
          <EuiPopover
            isOpen={showPopover}
            closePopover={() => setShowPopover(false)}
            button={
              <EuiButton
                fill
                iconSide="right"
                iconType="arrowDown"
                data-test-subj="emptyStateCreatePipelineDropdown"
                key="emptyStateCreatePipelineDropdown"
                onClick={() => setShowPopover((previousBool) => !previousBool)}
              >
                {i18n.translate(
                  'xpack.ingestPipelines.list.table.emptyCreatePipelineDropdownLabel',
                  {
                    defaultMessage: 'Create pipeline',
                  }
                )}
              </EuiButton>
            }
            panelPaddingSize="none"
            repositionOnScroll
          >
            <EuiContextMenu
              initialPanelId={0}
              data-test-subj="autoFollowPatternActionContextMenu"
              panels={[
                {
                  id: 0,
                  items: createMenuItems,
                },
              ]}
            />
          </EuiPopover>
        }
      />
    </EuiPageContent>
  );
};
