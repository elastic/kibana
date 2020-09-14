/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const InvisibleAnchor = styled.a`
  display: none;
`;

interface AutoDownloadProps {
  blob: Blob | undefined;
  name?: string;
  onDownload?: () => void;
}

export const AutoDownload: React.FC<AutoDownloadProps> = ({ blob, name, onDownload }) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (blob && anchorRef?.current) {
      if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
        window.navigator.msSaveBlob(blob);
      } else {
        const objectURL = window.URL.createObjectURL(blob);
        anchorRef.current.href = objectURL;
        anchorRef.current.download = name ?? 'download.txt';
        anchorRef.current.click();
        window.URL.revokeObjectURL(objectURL);
      }

      if (onDownload) {
        onDownload();
      }
    }
  }, [blob, name, onDownload]);

  return <InvisibleAnchor ref={anchorRef} />;
};
