/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiIcon, EuiCard } from '@elastic/eui';

import { EuiCardTo } from '../../../shared/react_router_helpers';
import { getEngineRoute, ENGINE_CRAWLER_PATH } from '../../routes';
import { EngineLogic } from '../engine';

import { DocumentCreationLogic } from './';

interface Props {
  disabled?: boolean;
}

export const DocumentCreationButtons: React.FC<Props> = ({ disabled = false }) => {
  const { openDocumentCreation } = useActions(DocumentCreationLogic);
  const { engineName } = useValues(EngineLogic);

  return (
    <EuiFlexGrid columns={2}>
      <EuiFlexItem>
        <EuiCard
          title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.text', {
            defaultMessage: 'Paste JSON',
          })}
          description=""
          icon={<EuiIcon type="indexEdit" size="xxl" color="primary" />}
          data-test-subj="IndexingPasteJSONButton"
          onClick={() => openDocumentCreation('text')}
          isDisabled={disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.file', {
            defaultMessage: 'Upload a JSON file',
          })}
          description=""
          icon={<EuiIcon type="exportAction" size="xxl" color="primary" />}
          onClick={() => openDocumentCreation('file')}
          isDisabled={disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.api', {
            defaultMessage: 'Index from API',
          })}
          description=""
          icon={<EuiIcon type="editorCodeBlock" size="xxl" color="primary" />}
          onClick={() => openDocumentCreation('api')}
          isDisabled={disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCardTo
          title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.crawl', {
            defaultMessage: 'Use the Crawler',
          })}
          description=""
          icon={<EuiIcon type="globe" size="xxl" color="primary" />}
          betaBadgeLabel={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.buttons.betaTitle',
            { defaultMessage: 'Beta' }
          )}
          betaBadgeTooltipContent={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.buttons.betaTooltip',
            {
              defaultMessage:
                'The Elastic Crawler is not GA. Please help us by reporting any bugs.',
            }
          )}
          to={getEngineRoute(engineName) + ENGINE_CRAWLER_PATH}
          isDisabled={disabled}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
