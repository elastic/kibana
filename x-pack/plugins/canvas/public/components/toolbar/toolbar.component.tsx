/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PageManager } from '../page_manager';
import { Expression } from '../expression';
import { Tray } from './tray';

import { CanvasElement } from '../../../types';
import { RoutingButtonIcon } from '../routing';

import { WorkpadRoutingContext } from '../../routes/workpad';

const strings = {
  getEditorButtonLabel: () =>
    i18n.translate('xpack.canvas.toolbar.editorButtonLabel', {
      defaultMessage: 'Expression editor',
    }),
  getNextPageAriaLabel: () =>
    i18n.translate('xpack.canvas.toolbar.nextPageAriaLabel', {
      defaultMessage: 'Next Page',
    }),
  getPageButtonLabel: (pageNum: number, totalPages: number) =>
    i18n.translate('xpack.canvas.toolbar.pageButtonLabel', {
      defaultMessage: 'Page {pageNum}{rest}',
      values: {
        pageNum,
        rest: totalPages > 1 ? ` of ${totalPages}` : '',
      },
    }),
  getPreviousPageAriaLabel: () =>
    i18n.translate('xpack.canvas.toolbar.previousPageAriaLabel', {
      defaultMessage: 'Previous Page',
    }),
};

type TrayType = 'pageManager' | 'expression';

export interface Props {
  isWriteable: boolean;
  selectedElement?: CanvasElement;
  selectedPageNumber: number;
  totalPages: number;
  workpadName: string;
}

export const Toolbar: FC<Props> = ({
  isWriteable,
  selectedElement,
  selectedPageNumber,
  totalPages,
  workpadName,
}) => {
  const [activeTray, setActiveTray] = useState<TrayType | null>(null);
  const { getUrl, previousPage } = useContext(WorkpadRoutingContext);

  // While the tray doesn't get activated if the workpad isn't writeable,
  // this effect will ensure that if the tray is open and the workpad
  // changes its writeable state, the tray will close.
  useEffect(() => {
    if (!isWriteable && activeTray === 'expression') {
      setActiveTray(null);
    }
  }, [isWriteable, activeTray]);

  const elementIsSelected = Boolean(selectedElement);

  const toggleTray = (tray: TrayType) => {
    if (activeTray === tray) {
      setActiveTray(null);
    } else {
      if (!isWriteable && tray === 'expression') {
        return;
      }
      setActiveTray(tray);
    }
  };

  const trays = {
    pageManager: <PageManager onPreviousPage={previousPage} />,
    expression: !elementIsSelected ? null : <Expression done={() => setActiveTray(null)} />,
  };

  return (
    <div className="canvasToolbar hide-for-sharing">
      {activeTray !== null && <Tray done={() => setActiveTray(null)}>{trays[activeTray]}</Tray>}
      <div className="canvasToolbar__container">
        <EuiFlexGroup gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false} className="canvasToolbar__home">
            {workpadName}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="none" className="canvasToolbar__controls">
              <EuiFlexItem grow={false}>
                <RoutingButtonIcon
                  color="text"
                  to={getUrl(selectedPageNumber - 1)}
                  iconType="arrowLeft"
                  isDisabled={selectedPageNumber <= 1}
                  aria-label={strings.getPreviousPageAriaLabel()}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="text"
                  onClick={() => toggleTray('pageManager')}
                  data-test-subj="canvasPageManagerButton"
                >
                  {strings.getPageButtonLabel(selectedPageNumber, totalPages)}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RoutingButtonIcon
                  color="text"
                  to={getUrl(selectedPageNumber + 1)}
                  iconType="arrowRight"
                  isDisabled={selectedPageNumber >= totalPages}
                  aria-label={strings.getNextPageAriaLabel()}
                />
              </EuiFlexItem>
              <EuiFlexItem />
              {elementIsSelected && isWriteable && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="text"
                    iconType="editorCodeBlock"
                    onClick={() => toggleTray('expression')}
                    data-test-subj="canvasExpressionEditorButton"
                  >
                    {strings.getEditorButtonLabel()}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};

Toolbar.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  selectedElement: PropTypes.object,
  selectedPageNumber: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  workpadName: PropTypes.string.isRequired,
};
