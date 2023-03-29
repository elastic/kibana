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
import { FileDownloadButtonIcon } from './file_download_button_icon';

export interface FilesTableColumnsProps {
  showPreview: (file: FileJSON) => void;
}

export const useFilesTableColumns = ({
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
          render: (file: FileJSON) => <FileDownloadButtonIcon fileId={file.id} />,
        },
        {
          name: 'Delete',
          isPrimary: true,
          description: i18n.DELETE_FILE,
          color: 'danger',
          icon: 'trash',
          type: 'icon',
          onClick: () => {},
          'data-test-subj': 'cases-files-table-action-delete',
        },
      ],
    },
  ];
};
