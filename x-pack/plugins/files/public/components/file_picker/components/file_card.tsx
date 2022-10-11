/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import numeral from '@elastic/numeral';
import { EuiCard, EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FileImageMetadata, FileJSON } from '../../../../common';
import { Image } from '../../image';
import { isImage } from '../../util';
import { useFilesContext } from '../../context';
import { useFilePickerContext } from '../context';

interface Props {
  file: FileJSON;
}

export const FileCard: FunctionComponent<Props> = ({ file }) => {
  const { client } = useFilesContext();
  const { kind } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const displayImage = isImage({ type: file.mimeType });
  return (
    <EuiCard
      titleSize="xs"
      title={file.name}
      image={
        <div
          css={css`
            display: grid;
            place-items: center;
            min-height: ${euiTheme.size.xxxxl};
          `}
        >
          {displayImage ? (
            <Image
              size="m"
              alt={file.alt ?? ''}
              src={client.getDownloadHref({ id: file.id, fileKind: kind })}
            />
          ) : (
            <EuiIcon type="filebeatApp" size="xl" />
          )}
        </div>
      }
      description={
        <>
          {displayImage ? (
            (file as FileJSON<FileImageMetadata>).meta?.height != null ? (
              <EuiText color="subdued" size="xs">
                {(file as FileJSON<FileImageMetadata>).meta?.width}px by{' '}
                {(file as FileJSON<FileImageMetadata>).meta?.height}px
              </EuiText>
            ) : null
          ) : null}
          <EuiText color="subdued" size="xs">
            <p>{numeral(file.size).format('0[.]0 b')}</p>
          </EuiText>
        </>
      }
      hasBorder
    />
  );
};
