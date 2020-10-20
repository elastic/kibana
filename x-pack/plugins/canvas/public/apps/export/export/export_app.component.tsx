/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import PropTypes from 'prop-types';
// @ts-expect-error untyped library
import Style from 'style-it';
// @ts-expect-error untyped local
import { WorkpadPage } from '../../../components/workpad_page';
import { Link } from '../../../components/link';
import { CanvasWorkpad } from '../../../../types';

interface Props {
  workpad: CanvasWorkpad;
  selectedPageIndex: number;
  initializeWorkpad: () => void;
}

export const ExportApp: FC<Props> = ({ workpad, selectedPageIndex, initializeWorkpad }) => {
  const { id, pages, height, width } = workpad;
  const activePage = pages[selectedPageIndex];
  const pageElementCount = activePage.elements.length;

  useEffect(() => initializeWorkpad());

  return (
    <div className="canvasExport" data-shared-page={selectedPageIndex + 1}>
      <div className="canvasExport__stage">
        <div className="canvasLayout__stageHeader">
          <Link name="loadWorkpad" params={{ id }}>
            Edit Workpad
          </Link>
        </div>
        {Style.it(
          workpad.css,
          <div className="canvasExport__stageContent" data-shared-items-count={pageElementCount}>
            <WorkpadPage
              isSelected
              key={activePage.id}
              pageId={activePage.id}
              height={height}
              width={width}
              registerLayout={() => {}}
              unregisterLayout={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
};

ExportApp.propTypes = {
  workpad: PropTypes.shape({
    id: PropTypes.string.isRequired,
    pages: PropTypes.array.isRequired,
  }).isRequired,
  selectedPageIndex: PropTypes.number.isRequired,
  initializeWorkpad: PropTypes.func.isRequired,
};
