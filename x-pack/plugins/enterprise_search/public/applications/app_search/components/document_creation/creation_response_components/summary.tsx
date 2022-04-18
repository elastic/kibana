/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiCallOut,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocumentCreationLogic } from '..';
import { CLOSE_BUTTON_LABEL } from '../../../../shared/constants';
import { FLYOUT_ARIA_LABEL_ID, DOCUMENT_CREATION_ERRORS } from '../constants';
import { DocumentCreationStep } from '../types';

import {
  InvalidDocumentsSummary,
  ValidDocumentsSummary,
  SchemaFieldsSummary,
} from './summary_sections';

export const Summary: React.FC = () => {
  return (
    <>
      <FlyoutHeader />
      <FlyoutBody />
      <FlyoutFooter />
    </>
  );
};

export const FlyoutHeader: React.FC = () => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={FLYOUT_ARIA_LABEL_ID}>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.showSummary.title', {
            defaultMessage: 'Indexing summary',
          })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  const { summary } = useValues(DocumentCreationLogic);
  const hasInvalidDocuments = summary.invalidDocuments.total > 0;
  const invalidDocumentsBanner = (
    <EuiCallOut color="danger" iconType="alert" title={DOCUMENT_CREATION_ERRORS.TITLE} />
  );

  return (
    <EuiFlyoutBody banner={hasInvalidDocuments && invalidDocumentsBanner}>
      <InvalidDocumentsSummary />
      <ValidDocumentsSummary />
      <SchemaFieldsSummary />
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  const { setCreationStep, closeDocumentCreation } = useActions(DocumentCreationLogic);
  const { summary } = useValues(DocumentCreationLogic);
  const hasInvalidDocuments = summary.invalidDocuments.total > 0;

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={closeDocumentCreation}>{CLOSE_BUTTON_LABEL}</EuiButton>
        </EuiFlexItem>
        {hasInvalidDocuments && (
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={() => setCreationStep(DocumentCreationStep.AddDocuments)}>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.fixErrors',
                { defaultMessage: 'Fix errors' }
              )}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
