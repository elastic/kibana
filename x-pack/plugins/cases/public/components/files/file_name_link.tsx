/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import * as i18n from './translations';
import { isImage } from './utils';

interface FileNameLinkProps {
  file: FileJSON;
  showPreview: () => void;
}

const FileNameLinkComponent: React.FC<FileNameLinkProps> = ({ file, showPreview }) => {
  const fileName = `${file.name}.${file.extension}`;

  if (isImage(file)) {
    return (
      <EuiLink onClick={showPreview} data-test-subj="cases-files-name-link">
        {fileName}
      </EuiLink>
    );
  } else {
    return (
      <span title={i18n.NO_PREVIEW} data-test-subj="cases-files-name-text">
        {fileName}
      </span>
    );
  }
};
FileNameLinkComponent.displayName = 'FileNameLink';

export const FileNameLink = React.memo(FileNameLinkComponent);
