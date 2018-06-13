/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiText,
  EuiIcon,
} from '@elastic/eui';

import {
  stopDatafeeds,
  cloneJob } from '../utils';

export function actionsMenuContent(showEditJobModal, showDeleteJobModal, showStartDatafeedModal, refreshJobs) {
  return [{
    render: (item) => {
      return (
        getStartStop(item, showStartDatafeedModal, refreshJobs)
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText onClick={() => cloneJob(item.id)}>
          <EuiIcon type="copy" />
          Clone job
        </MLText>
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText onClick={() => {
          showEditJobModal(item);
          closeMenu();
        }}
        >
          <EuiIcon type="copy" />
          Edit job
        </MLText>
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText
          color="danger"
          onClick={() => {
            showDeleteJobModal(item);
            closeMenu();
          }}
        >
          <EuiIcon type="trash" />
          Delete job
        </MLText>
      );
    }
  }];
}


function getStartStop(item, showStartDatafeedModal, refreshJobs) {
  if (item.datafeedState === 'stopped') {
    return (
      <MLText onClick={() => {
        showStartDatafeedModal(item);
        closeMenu();
      }}
      >
        <EuiIcon type="play" />
        Start datafeed
      </MLText>
    );
  }

  if (item.datafeedState === 'started') {
    return (
      <MLText onClick={() => {
        stopDatafeeds([item], refreshJobs);
        closeMenu(true);
      }}
      >
        <EuiIcon type="stop" />
        Stop datafeed
      </MLText>
    );
  }
}

// EuiText wrapper to stop event propagation so the menu items don't fire twice.
// this appears to be an issue with the EuiBasicTable actions col when specifying
// a custom render function which contains its own onClick
function MLText({ onClick, ...rest }) {
  const click = (e) => {
    e.stopPropagation();
    onClick();
  };
  return <EuiText onClick={click} {...rest} />;
}

function closeMenu(now = false) {
  if (now) {
    document.querySelector('.euiTable').click();
  } else {
    window.setTimeout(() => {
      const modalBody = document.querySelector('.euiModalBody');
      if (modalBody) {
        modalBody.click();
      } else {
        document.querySelector('.euiTable').click();
      }
    }, 500);
  }
}
