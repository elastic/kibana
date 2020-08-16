/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { DomPreview } from '../dom_preview';
import { PageControls } from './page_controls';
import { CanvasPage } from '../../../types';

interface Props {
  isWriteable: boolean;
  page: Pick<CanvasPage, 'id' | 'style'>;
  height: number;
  onDuplicate: (pageId: string) => void;
  onRemove: (pageId: string) => void;
}
export const PagePreview: FC<Props> = ({ isWriteable, page, height, onDuplicate, onRemove }) => (
  <div
    className="canvasPageManager__pagePreview"
    style={{ backgroundColor: page.style.background }}
  >
    <DomPreview elementId={page.id} height={height} />
    {isWriteable && <PageControls pageId={page.id} onDuplicate={onDuplicate} onRemove={onRemove} />}
  </div>
);

PagePreview.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
    style: PropTypes.shape({
      background: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  height: PropTypes.number.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
