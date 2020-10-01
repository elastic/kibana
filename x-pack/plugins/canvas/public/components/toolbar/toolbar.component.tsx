/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOverlayMask,
  EuiModal,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';

// @ts-expect-error untyped local
import { WorkpadManager } from '../workpad_manager';
import { RouterContext } from '../router';
import { PageManager } from '../page_manager';
// @ts-expect-error untyped local
import { Expression } from '../expression';
import { Tray } from './tray';

import { CanvasElement } from '../../../types';
import { ComponentStrings } from '../../../i18n';

const { Toolbar: strings } = ComponentStrings;

type TrayType = 'pageManager' | 'expression';

interface Props {
  isWriteable: boolean;
  selectedElement?: CanvasElement;
  selectedPageNumber: number;
  totalPages: number;
  workpadId: string;
  workpadName: string;
}

export const Toolbar: FC<Props> = ({
  isWriteable,
  selectedElement,
  selectedPageNumber,
  totalPages,
  workpadId,
  workpadName,
}) => {
  const [activeTray, setActiveTray] = useState<TrayType | null>(null);
  const [showWorkpadManager, setShowWorkpadManager] = useState(false);
  const router = useContext(RouterContext);

  // While the tray doesn't get activated if the workpad isn't writeable,
  // this effect will ensure that if the tray is open and the workpad
  // changes its writeable state, the tray will close.
  useEffect(() => {
    if (!isWriteable && activeTray === 'expression') {
      setActiveTray(null);
    }
  }, [isWriteable, activeTray]);

  if (!router) {
    return <div>{strings.getErrorMessage('Router Undefined')}</div>;
  }

  const nextPage = () => {
    const page = Math.min(selectedPageNumber + 1, totalPages);
    router.navigateTo('loadWorkpad', { id: workpadId, page });
  };

  const previousPage = () => {
    const page = Math.max(1, selectedPageNumber - 1);
    router.navigateTo('loadWorkpad', { id: workpadId, page });
  };

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

  const closeWorkpadManager = () => setShowWorkpadManager(false);
  const openWorkpadManager = () => setShowWorkpadManager(true);

  const workpadManager = (
    <EuiOverlayMask>
      <EuiModal onClose={closeWorkpadManager} className="canvasModal--fixedSize" maxWidth="1000px">
        <WorkpadManager onClose={closeWorkpadManager} />
        <EuiModalFooter>
          <EuiButton size="s" onClick={closeWorkpadManager}>
            {strings.getWorkpadManagerCloseButtonLabel()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  const trays = {
    pageManager: <PageManager onPreviousPage={previousPage} />,
    expression: !elementIsSelected ? null : <Expression done={() => setActiveTray(null)} />,
  };

  return (
    <div className="canvasToolbar hide-for-sharing">
      {activeTray !== null && <Tray done={() => setActiveTray(null)}>{trays[activeTray]}</Tray>}
      <div className="canvasToolbar__container">
        <EuiFlexGroup alignItems="center" gutterSize="none" className="canvasToolbar__controls">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="text" iconType="grid" onClick={() => openWorkpadManager()}>
              {workpadName}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false} />
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              onClick={previousPage}
              iconType="arrowLeft"
              disabled={selectedPageNumber <= 1}
              aria-label={strings.getPreviousPageAriaLabel()}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="text" onClick={() => toggleTray('pageManager')}>
              {strings.getPageButtonLabel(selectedPageNumber, totalPages)}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              onClick={nextPage}
              iconType="arrowRight"
              disabled={selectedPageNumber >= totalPages}
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
      </div>
      {showWorkpadManager && workpadManager}
    </div>
  );
};

Toolbar.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  selectedElement: PropTypes.object,
  selectedPageNumber: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  workpadId: PropTypes.string.isRequired,
  workpadName: PropTypes.string.isRequired,
};
