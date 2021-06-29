/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiTabbedContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// @ts-expect-error unconverted component
import { Datasource } from '../../datasource';
// @ts-expect-error unconverted component
import { FunctionFormList } from '../../function_form_list';
import { PositionedElement } from '../../../../types';

const strings = {
  getDataTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.dataTabLabel', {
      defaultMessage: 'Data',
      description:
        'This tab contains the settings for the data (i.e. Elasticsearch query) used as ' +
        'the source for a Canvas element',
    }),
  getDisplayTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.displayTabLabel', {
      defaultMessage: 'Display',
      description: 'This tab contains the settings for how data is displayed in a Canvas element',
    }),
};

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
      name: strings.getDisplayTabLabel(),
      content: (
        <div className="canvasSidebar__pop">
          <div className="canvasSidebar--args">
            <FunctionFormList element={element} />
          </div>
        </div>
      ),
    },
    {
      id: 'data',
      name: strings.getDataTabLabel(),
      content: (
        <div className="canvasSidebar__pop">
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
