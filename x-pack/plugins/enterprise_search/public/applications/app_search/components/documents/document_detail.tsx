/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiPageHeader,
  EuiPageContentBody,
  EuiPageContent,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DELETE_BUTTON_LABEL } from '../../../shared/constants';
import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { useDecodedParams } from '../../utils/encode_path_params';
import { getEngineBreadcrumbs } from '../engine';
import { ResultFieldValue } from '../result';

import { DOCUMENTS_TITLE } from './constants';
import { DocumentDetailLogic } from './document_detail_logic';
import { FieldDetails } from './types';

const DOCUMENT_DETAIL_TITLE = (documentId: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.title', {
    defaultMessage: 'Document: {documentId}',
    values: { documentId },
  });

export const DocumentDetail: React.FC = () => {
  const { dataLoading, fields } = useValues(DocumentDetailLogic);
  const { deleteDocument, getDocumentDetails, setFields } = useActions(DocumentDetailLogic);

  const { documentId } = useParams() as { documentId: string };
  const { documentId: documentTitle } = useDecodedParams();

  useEffect(() => {
    getDocumentDetails(documentId);
    return () => {
      setFields([]);
    };
  }, []);

  if (dataLoading) {
    return <Loading />;
  }

  const columns: Array<EuiBasicTableColumn<FieldDetails>> = [
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.fieldHeader', {
        defaultMessage: 'Field',
      }),
      width: '20%',
      render: (field: FieldDetails) => field.name,
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.valueHeader', {
        defaultMessage: 'Value',
      }),
      width: '80%',
      render: ({ value, type }: FieldDetails) => <ResultFieldValue raw={value} type={type} />,
    },
  ];

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([DOCUMENTS_TITLE, documentTitle])} />
      <EuiPageHeader
        pageTitle={DOCUMENT_DETAIL_TITLE(documentTitle)}
        rightSideItems={[
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => deleteDocument(documentId)}
            data-test-subj="DeleteDocumentButton"
          >
            {DELETE_BUTTON_LABEL}
          </EuiButton>,
        ]}
      />
      <EuiPageContent hasBorder>
        <EuiPageContentBody>
          <FlashMessages />
          <EuiBasicTable columns={columns} items={fields} />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
