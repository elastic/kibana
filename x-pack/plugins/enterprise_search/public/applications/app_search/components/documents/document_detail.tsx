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
import { useDecodedParams } from '../../utils/encode_path_params';
import { ResultFieldValue } from '../result';

import { DocumentDetailLogic } from './document_detail_logic';
import { FieldDetails } from './types';
import { DOCUMENTS_TITLE } from './constants';

const DOCUMENT_DETAIL_TITLE = (documentId: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.title', {
    defaultMessage: 'Document: {documentId}',
    values: { documentId },
  });
interface Props {
  engineBreadcrumb: string[];
}

export const DocumentDetail: React.FC<Props> = ({ engineBreadcrumb }) => {
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
      <SetPageChrome trail={[...engineBreadcrumb, DOCUMENTS_TITLE, documentTitle]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{DOCUMENT_DETAIL_TITLE(documentTitle)}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => deleteDocument(documentId)}
            data-test-subj="DeleteDocumentButton"
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.documentDetail.deleteButton', {
              defaultMessage: 'Delete',
            })}
          </EuiButton>
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
