/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiModal, EuiOverlayMask } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { StatefulOpenTimeline } from '..';

import * as i18n from '../translations';

interface Props {
  /**
   * An optional callback that if specified, will perform arbitrary IO before
   * this component updates its internal toggle state.
   */
  onToggle?: () => void;
}

interface State {
  showModal: boolean;
}

const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;
const OPEN_TIMELINE_MODAL_WIDTH = 1000; // px

// TODO: this container can be removed when
// the following EUI PR is available (in Kibana):
// https://github.com/elastic/eui/pull/1902/files#diff-d662c14c5dcd7e4b41028bf60b9bc77b
const ModalContainer = styled.div`
  .euiModalBody {
    display: flex;
    flex-direction: column;
  }
`;

/**
 * Renders a button that when clicked, displays the `Open Timelines` modal
 */
export class OpenTimelineModalButton extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showModal: false };
  }

  public render() {
    return (
      <>
        <EuiButtonEmpty
          color="text"
          data-test-subj="open-timeline-button"
          iconSide="left"
          iconType="folderOpen"
          onClick={this.toggleShowModal}
        >
          {i18n.OPEN_TIMELINE}
        </EuiButtonEmpty>

        {this.state.showModal && (
          <EuiOverlayMask>
            <ModalContainer>
              <EuiModal
                data-test-subj="open-timeline-modal"
                maxWidth={OPEN_TIMELINE_MODAL_WIDTH}
                onClose={this.toggleShowModal}
              >
                <StatefulOpenTimeline
                  openTimeline={this.openTimeline}
                  defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                  searchResults={[]}
                  title={i18n.OPEN_TIMELINE_TITLE}
                />
              </EuiModal>
            </ModalContainer>
          </EuiOverlayMask>
        )}
      </>
    );
  }

  /** shows or hides the `Open Timeline` modal */
  private toggleShowModal = () => {
    if (this.props.onToggle != null) {
      this.props.onToggle();
    }

    this.setState(state => ({
      showModal: !state.showModal,
    }));
  };

  private openTimeline = ({
    duplicate,
    timelineId,
  }: {
    duplicate: boolean;
    timelineId: string;
  }) => {
    this.toggleShowModal();

    alert(`TODO: open timeline ID: ${timelineId} duplicate: ${duplicate}`);
  };
}
