/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DomPreview } from '../dom_preview';
import { PageControls } from './page_controls';

export const PagePreview = ({
  isWriteable,
  page,
  pageNumber,
  height,
  duplicatePage,
  confirmDelete,
}) => (
  <div
    className="canvasPageManager__pagePreview"
    style={{ backgroundColor: page.style.background }}
  >
    <DomPreview elementId={page.id} pageNumber={pageNumber} height={height} />
    {isWriteable && (
      <PageControls
        pageId={page.id}
        pageNumber={pageNumber}
        onDuplicate={duplicatePage}
        onDelete={confirmDelete}
      />
    )}
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
  pageNumber: PropTypes.number.isRequired,
  duplicatePage: PropTypes.func.isRequired,
  confirmDelete: PropTypes.func.isRequired,
};
