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
import { FileJSON } from '../../../../common';
import { Image } from '../../image';
import { isImage } from '../../util';
import { useFilesContext } from '../../context';
import { useFilePickerContext } from '../context';

import './file_card.scss';

interface Props {
  file: FileJSON;
}

export const FileCard: FunctionComponent<Props> = ({ file }) => {
  const { client } = useFilesContext();
  const { kind, state } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const displayImage = isImage({ type: file.mimeType });
  const isSelected = state.hasFileId(file.id);
  const imageHeight = `calc(${euiTheme.size.xxxl} * 2)`;
  return (
    <EuiCard
      title=""
      css={css`
        place-self: center;
      `}
      paddingSize="s"
      selectable={{
        isSelected,
        onClick: () => (isSelected ? state.removeFile(file.id) : state.addFile(file.id)),
      }}
      image={
        <div
          css={css`
            display: grid;
            place-items: center;
            height: ${imageHeight};
          `}
        >
          {displayImage ? (
            <Image
              alt={file.alt ?? ''}
              css={css`
                max-height: ${imageHeight};
              `}
              src={client.getDownloadHref({ id: file.id, fileKind: kind })}
            />
          ) : (
            <EuiIcon type="filebeatApp" size="xl" />
          )}
        </div>
      }
      description={
        <>
          <EuiText size="s">
            <strong>
              {file.name}.{file.extension}
            </strong>
          </EuiText>
          <EuiText color="subdued" size="xs">
            {numeral(file.size).format('0[.]0 b')}
          </EuiText>
        </>
      }
      hasBorder
    />
  );
};
