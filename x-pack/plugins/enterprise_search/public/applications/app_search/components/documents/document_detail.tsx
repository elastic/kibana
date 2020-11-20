/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useActions, useValues } from 'kea';
import { useParams } from 'react-router-dom';

import {
  EuiButton,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContentBody,
  EuiPageContent,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Loading } from '../../../shared/loading';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { FlashMessages } from '../../../shared/flash_messages';
import { ResultFieldValue } from '../result_field_value';

import { DocumentDetailLogic } from './document_detail_logic';
import { FieldDetails } from './types';
import { DOCUMENTS_TITLE } from './constants';

const DOCUMENT_DETAIL_TITLE = (documentId: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.title', {
    defaultMessage: 'Document: {documentId}',
    values: { documentId },
  });

const DELETE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentDetail.deleteButton',
  {
    defaultMessage: 'Delete',
  }
);

interface Props {
  engineBreadcrumb: string[];
}

export const DocumentDetail: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { dataLoading, fields } = useValues(DocumentDetailLogic);
  const { deleteDocument, getDocumentDetails, setFields } = useActions(DocumentDetailLogic);

  const { documentId } = useParams() as { documentId: string };

  useEffect(() => {
    getDocumentDetails(documentId);
    return () => {
      setFields([]);
    };
  }, []);

  if (dataLoading) {
    return <Loading />;
  }

  const deleteDocumentButton = (
    <EuiButton
      color="danger"
      iconType="trash"
      onClick={() => {
        deleteDocument(documentId);
      }}
      data-test-subj="DeleteDocumentButton"
    >
      {DELETE_BUTTON}
    </EuiButton>
  );

  const columns: Array<EuiBasicTableColumn<FieldDetails>> = [
    {
      name: 'Field',
      width: '20%',
      render: (field: FieldDetails) => field.name,
    },
    {
      name: 'Value',
      width: '80%',
      render: ({ value, type }: FieldDetails) => <ResultFieldValue raw={value} type={type} />,
    },
  ];

  return (
    <>
      <SetPageChrome
        trail={[...engineBreadcrumb, DOCUMENTS_TITLE, decodeURIComponent(documentId)]}
      />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{DOCUMENT_DETAIL_TITLE(decodeURIComponent(documentId))}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{deleteDocumentButton}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <FlashMessages />
          <EuiBasicTable columns={columns} items={fields} />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
