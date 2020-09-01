/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { DragDropContext, Droppable, Draggable, DragDropContextProps } from 'react-beautiful-dnd';
// @ts-expect-error untyped dependency
import Style from 'style-it';

import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { PagePreview } from '../page_preview';

import { ComponentStrings } from '../../../i18n';
import { CanvasPage } from '../../../types';

const { PageManager: strings } = ComponentStrings;

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
    const { onPreviousPage, onRemovePage, selectedPage } = this.props;
    const { removeId } = this.state;
    this.resetRemove();

    if (removeId === selectedPage) {
      onPreviousPage();
    }

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
    const { isWriteable, selectedPage, workpadId, workpadCSS } = this.props;
    const pageNumber = i + 1;

    return (
      <Draggable key={page.id} draggableId={page.id} index={i} isDragDisabled={!isWriteable}>
        {(provided) => (
          <div
            key={page.id}
            className={`canvasPageManager__page ${
              page.id === selectedPage ? 'canvasPageManager__page-isActive' : ''
            }`}
            ref={(el) => {
              if (page.id === selectedPage) {
                this._activePageRef = el;
              }
              provided.innerRef(el);
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" className="canvasPageManager__pageNumber">
                  {pageNumber}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Link
                  name="loadWorkpad"
                  params={{ id: workpadId, page: pageNumber }}
                  aria-label={strings.getPageNumberAriaLabel(pageNumber)}
                >
                  {Style.it(
                    workpadCSS,
                    <div>
                      <PagePreview height={100} page={page} onRemove={this.onConfirmRemove} />
                    </div>
                  )}
                </Link>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </Draggable>
    );
  };

  render() {
    const { pages, onAddPage, isWriteable } = this.props;
    const { showTrayPop, removeId } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="none" className="canvasPageManager">
          <EuiFlexItem className="canvasPageManager__pages">
            <DragDropContext onDragEnd={this.onDragEnd}>
              <Droppable droppableId="droppable-page-manager" direction="horizontal">
                {(provided) => (
                  <div
                    className={`canvasPageManager__pageList ${
                      showTrayPop ? 'canvasPageManager--trayPop' : ''
                    }`}
                    ref={(el) => {
                      this._pageListRef = el;
                      provided.innerRef(el);
                    }}
                    {...provided.droppableProps}
                  >
                    {pages.map(this.renderPage)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
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
