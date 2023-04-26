/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import * as i18n from './translations';
import { parseMimeType } from './utils';
import { FileNameLink } from './file_name_link';
import { FileDownloadButton } from './file_download_button';
import { FileDeleteButton } from './file_delete_button';

export interface FilesTableColumnsProps {
  caseId: string;
  showPreview: (file: FileJSON) => void;
}

export const useFilesTableColumns = ({
  caseId,
  showPreview,
}: FilesTableColumnsProps): Array<EuiBasicTableColumn<FileJSON>> => {
  return [
    {
      name: i18n.NAME,
      'data-test-subj': 'cases-files-table-filename',
      render: (file: FileJSON) => (
        <FileNameLink file={file} showPreview={() => showPreview(file)} />
      ),
      width: '60%',
    },
    {
      name: i18n.TYPE,
      'data-test-subj': 'cases-files-table-filetype',
      render: (attachment: FileJSON) => {
        return <span>{parseMimeType(attachment.mimeType)}</span>;
      },
    },
    {
      name: i18n.DATE_ADDED,
      field: 'created',
      'data-test-subj': 'cases-files-table-date-added',
      dataType: 'date',
    },
    {
      name: i18n.ACTIONS,
      width: '120px',
      actions: [
        {
          name: 'Download',
          isPrimary: true,
          description: i18n.DOWNLOAD_FILE,
          render: (file: FileJSON) => <FileDownloadButton fileId={file.id} isIcon={true} />,
        },
        {
          name: 'Delete',
          isPrimary: true,
          description: i18n.DELETE_FILE,
          render: (file: FileJSON) => (
            <FileDeleteButton caseId={caseId} fileId={file.id} isIcon={true} />
          ),
        },
      ],
    },
  ];
};
