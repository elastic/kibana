/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
// @ts-expect-error untyped dependency
import Style from 'style-it';

import { DomPreview } from '../dom_preview';
import { PageControls } from './page_controls';
import { RouterContext } from '../router';

import { ComponentStrings } from '../../../i18n';
import { CanvasPage } from '../../../types';

const { PagePreview: strings } = ComponentStrings;

interface Props {
  height: number;
  isWriteable: boolean;
  onDuplicate: (pageId: string) => void;
  onRemove: (pageId: string) => void;
  page: Pick<CanvasPage, 'id' | 'style'>;
  pageNumber: number;
  workpadCSS?: string;
  workpadId: string;
}
export const PagePreview: FC<Props> = ({
  isWriteable,
  page,
  height,
  onDuplicate,
  onRemove,
  pageNumber,
  workpadCSS,
  workpadId,
}) => {
  const router = useContext(RouterContext);

  if (!router) {
    return <div>{strings.getErrorMessage('Router Undefined')}</div>;
  }

  return (
    <div className="canvasPagePreview" style={{ backgroundColor: page.style.background }}>
      <EuiLink
        onClick={() => router.navigateTo('loadWorkpad', { id: workpadId, page: pageNumber })}
        aria-label={strings.getPageNumberAriaLabel(pageNumber)}
      >
        {Style.it(
          workpadCSS,
          <div className="canvasPagePreview__stage">
            <DomPreview elementId={page.id} height={height} />
          </div>
        )}
      </EuiLink>
      {isWriteable && (
        <PageControls pageId={page.id} onDuplicate={onDuplicate} onRemove={onRemove} />
      )}
    </div>
  );
};

PagePreview.propTypes = {
  height: PropTypes.number.isRequired,
  isWriteable: PropTypes.bool.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
    style: PropTypes.shape({
      background: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  pageNumber: PropTypes.number.isRequired,
  workpadCSS: PropTypes.string,
  workpadId: PropTypes.string.isRequired,
};
