/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  DragDropContextProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// @ts-expect-error untyped dependency
import Style from 'style-it';
import { ConfirmModal } from '../confirm_modal';
import { RoutingLink } from '../routing';
import { WorkpadRoutingContext } from '../../routes/workpad';
import { PagePreview } from '../page_preview';

import { CanvasPage } from '../../../types';

const strings = {
  getAddPageTooltip: () =>
    i18n.translate('xpack.canvas.pageManager.addPageTooltip', {
      defaultMessage: 'Add a new page to this workpad',
    }),
  getConfirmRemoveTitle: () =>
    i18n.translate('xpack.canvas.pageManager.confirmRemoveTitle', {
      defaultMessage: 'Remove Page',
    }),
  getConfirmRemoveDescription: () =>
    i18n.translate('xpack.canvas.pageManager.confirmRemoveDescription', {
      defaultMessage: 'Are you sure you want to remove this page?',
    }),
  getConfirmRemoveButtonLabel: () =>
    i18n.translate('xpack.canvas.pageManager.removeButtonLabel', {
      defaultMessage: 'Remove',
    }),
};
export interface Props {
  isWriteable: boolean;
  onAddPage: () => void;
  onMovePage: (pageId: string, position: number) => void;
  onPreviousPage: () => void;
  onRemovePage: (pageId: string) => void;
  pages: CanvasPage[];
  selectedPage?: string;
  workpadCSS?: string;
  workpadId: string;
}

interface State {
  showTrayPop: boolean;
  removeId: string | null;
}

export class PageManager extends Component<Props, State> {
  static propTypes = {
    isWriteable: PropTypes.bool.isRequired,
    onAddPage: PropTypes.func.isRequired,
    onMovePage: PropTypes.func.isRequired,
    onPreviousPage: PropTypes.func.isRequired,
    onRemovePage: PropTypes.func.isRequired,
    pages: PropTypes.array.isRequired,
    selectedPage: PropTypes.string,
    workpadCSS: PropTypes.string,
    workpadId: PropTypes.string.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      showTrayPop: true,
      removeId: null,
    };
  }

  _isMounted: boolean = false;
  _activePageRef: HTMLDivElement | null = null;
  _pageListRef: HTMLDivElement | null = null;

  componentDidMount() {
    // keep track of whether or not the component is mounted, to prevent rogue setState calls
    this._isMounted = true;

    // gives the tray pop animation time to finish
    setTimeout(() => {
      this.scrollToActivePage();
      if (this._isMounted) {
        this.setState({ showTrayPop: false });
      }
    }, 1000);
  }

  componentDidUpdate(prevProps: Props) {
    // scrolls to the active page on the next tick, otherwise new pages don't scroll completely into view
    if (prevProps.selectedPage !== this.props.selectedPage) {
      setTimeout(this.scrollToActivePage, 0);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  scrollToActivePage = () => {
    if (this._activePageRef && this._pageListRef) {
      // not all target browsers support element.scrollTo
      // TODO: replace this with something more cross-browser, maybe scrollIntoView
      if (!this._pageListRef.scrollTo) {
        return;
      }

      const pageOffset = this._activePageRef.offsetLeft;
      const {
        left: pageLeft,
        right: pageRight,
        width: pageWidth,
      } = this._activePageRef.getBoundingClientRect();
      const {
        left: listLeft,
        right: listRight,
        width: listWidth,
      } = this._pageListRef.getBoundingClientRect();

      if (pageLeft < listLeft) {
        this._pageListRef.scrollTo({
          left: pageOffset,
          behavior: 'smooth',
        });
      }
      if (pageRight > listRight) {
        this._pageListRef.scrollTo({
          left: pageOffset - listWidth + pageWidth,
          behavior: 'smooth',
        });
      }
    }
  };

  onConfirmRemove = (removeId: string) => {
    if (this._isMounted) {
      this.setState({ removeId });
    }
  };

  resetRemove = () => this._isMounted && this.setState({ removeId: null });

  doRemove = () => {
    const { onRemovePage } = this.props;
    const { removeId } = this.state;
    this.resetRemove();

    if (removeId !== null) {
      onRemovePage(removeId);
    }
  };

  onDragEnd: DragDropContextProps['onDragEnd'] = ({ draggableId: pageId, source, destination }) => {
    // dropped outside the list
    if (!destination) {
      return;
    }

    const position = destination.index - source.index;

    this.props.onMovePage(pageId, position);
  };

  renderPage = (page: CanvasPage, i: number) => {
    const { isWriteable, selectedPage, workpadCSS } = this.props;
    const pageNumber = i + 1;

    return (
      <EuiDraggable
        key={page.id}
        draggableId={page.id}
        index={i}
        isDragDisabled={!isWriteable}
        className={`canvasPageManager__page ${
          page.id === selectedPage ? 'canvasPageManager__page-isActive' : ''
        }`}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" className="canvasPageManager__pageNumber">
              {pageNumber}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <WorkpadRoutingContext.Consumer>
              {({ getUrl }) => (
                <RoutingLink to={getUrl(pageNumber)}>
                  {Style.it(
                    workpadCSS,
                    <div>
                      <PagePreview height={100} page={page} onRemove={this.onConfirmRemove} />
                    </div>
                  )}
                </RoutingLink>
              )}
            </WorkpadRoutingContext.Consumer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDraggable>
    );
  };

  render() {
    const { pages, onAddPage, isWriteable } = this.props;
    const { showTrayPop, removeId } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="none" className="canvasPageManager">
          <EuiFlexItem className="canvasPageManager__pages">
            <EuiDragDropContext onDragEnd={this.onDragEnd}>
              <EuiDroppable droppableId="droppable-page-manager" grow={true} direction="horizontal">
                <div
                  className={`canvasPageManager__pageList ${
                    showTrayPop ? 'canvasPageManager--trayPop' : ''
                  }`}
                >
                  {pages.map(this.renderPage)}
                </div>
              </EuiDroppable>
            </EuiDragDropContext>
          </EuiFlexItem>
          {isWriteable && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                anchorClassName="canvasPageManager__addPageTip"
                content={strings.getAddPageTooltip()}
                position="left"
              >
                <button
                  onClick={onAddPage}
                  className="canvasPageManager__addPage kbn-resetFocusState"
                  data-test-subj="canvasAddPageButton"
                >
                  <EuiIcon color="ghost" type="plusInCircle" size="l" />
                </button>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <ConfirmModal
          isOpen={removeId !== null}
          title={strings.getConfirmRemoveTitle()}
          message={strings.getConfirmRemoveDescription()}
          confirmButtonText={strings.getConfirmRemoveButtonLabel()}
          onConfirm={this.doRemove}
          onCancel={this.resetRemove}
        />
      </Fragment>
    );
  }
}
