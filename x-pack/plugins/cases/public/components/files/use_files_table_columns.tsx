/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiLink, EuiButtonIcon } from '@elastic/eui';

import type { Owner } from '../../../common/constants/types';

import { constructFileKindIdByOwner } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';
import { isImage } from './utils';

export interface FilesTableColumnsProps {
  showPreview: (file: FileJSON) => void;
  getDownloadHref: (args: Pick<FileJSON<unknown>, 'id' | 'fileKind'>) => string;
}

export const useFilesTableColumns = ({
  showPreview,
  getDownloadHref,
}: FilesTableColumnsProps): Array<EuiBasicTableColumn<FileJSON>> => {
  const { owner } = useCasesContext();

  return [
    {
      name: i18n.NAME,
      'data-test-subj': 'cases-files-table-filename',
      render: (attachment: FileJSON) => {
        if (isImage(attachment)) {
          return <EuiLink onClick={() => showPreview(attachment)}>{attachment.name}</EuiLink>;
        } else {
          return <span title={i18n.NO_PREVIEW}>{attachment.name}</span>;
        }
      },
      width: '60%',
    },
    {
      name: i18n.TYPE,
      field: 'mimeType',
      'data-test-subj': 'cases-files-table-filetype',
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
          render: (attachment: FileJSON) => {
            return (
              <EuiButtonIcon
                iconType={'download'}
                aria-label={'download'}
                href={getDownloadHref({
                  fileKind: constructFileKindIdByOwner(owner[0] as Owner),
                  id: attachment.id,
                })}
                data-test-subj={'cases-files-table-action-download'}
              />
            );
          },
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
