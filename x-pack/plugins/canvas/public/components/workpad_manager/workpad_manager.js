/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiTabbedContent,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { WorkpadLoader } from '../workpad_loader';
import { WorkpadTemplates } from '../workpad_templates';
import { ComponentStrings } from '../../../i18n';

const { WorkpadManager: strings } = ComponentStrings;

export const WorkpadManager = ({ onClose }) => {
  const tabs = [
    {
      id: 'workpadLoader',
      name: strings.getMyWorkpadsTabLabel(),
      content: (
        <Fragment>
          <EuiSpacer />
          <WorkpadLoader onClose={onClose} />
        </Fragment>
      ),
    },
    {
      id: 'workpadTemplates',
      name: strings.getWorkpadTemplatesTabLabel(),
      'data-test-subj': 'workpadTemplates',
      content: (
        <Fragment>
          <EuiSpacer />
          <WorkpadTemplates onClose={onClose} />
        </Fragment>
      ),
    },
  ];
  return (
    <Fragment>
      <EuiModalHeader className="canvasHomeApp__modalHeader">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle>
              <h1>{strings.getModalTitle()}</h1>
            </EuiModalHeaderTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody className="canvasHomeApp__modalBody">
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
      </EuiModalBody>
    </Fragment>
  );
};

WorkpadManager.propTypes = {
  onClose: PropTypes.func,
};
