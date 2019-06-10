/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiSpacer, EuiTabbedContent } from '@elastic/eui';
// @ts-ignore unconverted component
import { Datasource } from '../../datasource';
// @ts-ignore unconverted component
import { FunctionFormList } from '../../function_form_list';
import { PositionedElement } from '../../../lib/positioned_element';

interface Props {
  /**
   * a Canvas element used to populate config forms
   */
  element: PositionedElement;
}

export const ElementSettings: FunctionComponent<Props> = ({ element }) => {
  const tabs = [
    {
      id: 'edit',
      name: 'Display',
      content: (
        <div className="canvasSidebar__pop">
          <EuiSpacer size="s" />
          <div className="canvasSidebar--args">
            <FunctionFormList element={element} />
          </div>
        </div>
      ),
    },
    {
      id: 'data',
      name: 'Data',
      content: (
        <div className="canvasSidebar__pop">
          <EuiSpacer size="s" />
          <Datasource />
        </div>
      ),
    },
  ];

  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />;
};

ElementSettings.propTypes = {
  element: PropTypes.object,
};
