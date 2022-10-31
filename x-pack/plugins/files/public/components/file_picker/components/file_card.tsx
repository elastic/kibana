/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FunctionComponent } from 'react';
import numeral from '@elastic/numeral';
import useObservable from 'react-use/lib/useObservable';
import { EuiCard, EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FileImageMetadata, FileJSON } from '../../../../common';
import { Image } from '../../image';
import { isImage } from '../../util';
import { useFilePickerContext } from '../context';

import './file_card.scss';

interface Props {
  file: FileJSON;
}

export const FileCard: FunctionComponent<Props> = ({ file }) => {
  const { kind, state, client } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const displayImage = isImage({ type: file.mimeType });
  const isSelected$ = useMemo(() => state.watchFileSelected$(file.id), [file.id, state]);
  const isSelected = useObservable(isSelected$, false);

  const imageHeight = `calc(${euiTheme.size.xxxl} * 2)`;
  return (
    <EuiCard
      title=""
      css={css`
        place-self: stretch;
      `}
      paddingSize="s"
      selectable={{
        isSelected,
        onClick: () => (isSelected ? state.unselectFile(file.id) : state.selectFile(file.id)),
      }}
      image={
        <div
          css={css`
            display: grid;
            place-items: center;
            height: ${imageHeight};
            margin: ${euiTheme.size.m};
          `}
        >
          {displayImage ? (
            <Image
              alt={file.alt ?? ''}
              css={css`
                max-height: ${imageHeight};
              `}
              meta={file.meta as FileImageMetadata}
              src={client.getDownloadHref({ id: file.id, fileKind: kind })}
            />
          ) : (
            <div
              css={css`
                display: grid;
                place-items: center;
                height: ${imageHeight};
              `}
            >
              <EuiIcon type="filebeatApp" size="xl" />
            </div>
          )}
        </div>
      }
      description={
        <>
          <EuiText
            size="s"
            css={css`
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            `}
          >
            <strong>{file.name}</strong>
          </EuiText>
          <EuiText color="subdued" size="xs">
            {numeral(file.size).format('0[.]0 b')}
            {file.extension && (
              <>
                &nbsp; &#183; &nbsp;
                <span
                  css={css`
                    text-transform: uppercase;
                  `}
                >
                  {file.extension}
                </span>
              </>
            )}
          </EuiText>
        </>
      }
      hasBorder
    />
  );
};
