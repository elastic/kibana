/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// @ts-expect-error unconverted component
import { Datasource } from '../../datasource';
// @ts-expect-error unconverted component
import { FunctionFormList } from '../../function_form_list';
import { PositionedElement } from '../../../../types';
import { WorkpadFilters } from '../../workpad_filters/workpad_filters';
import { isExpressionWithFilters } from '../../../lib/filter';

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
  getFiltersTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.filtersTabLabel', {
      defaultMessage: 'Filters',
      description: 'This tab contains information about filters related to a Canvas element',
    }),
};

interface Props {
  /**
   * a Canvas element used to populate config forms
   */
  element: PositionedElement;
}

export const ElementSettings: FunctionComponent<Props> = ({ element }) => {
  const filtersTab = isExpressionWithFilters(element.expression) && {
    id: 'filters',
    name: strings.getFiltersTabLabel(),
    content: (
      <div className="canvasSidebar__pop">
        <WorkpadFilters element={element} />
      </div>
    ),
  };

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
    ...(filtersTab ? [filtersTab] : []),
  ];

  const [selectedTab, setSelectedTab] = useState<EuiTabbedContentTab>(tabs[0]);

  const onTabClick = (tab: EuiTabbedContentTab) => setSelectedTab(tab);

  const getTab = (tabId: string) => tabs.filter((tab) => tab.id === tabId)[0] ?? tabs[0];

  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={getTab(selectedTab.id)}
      onTabClick={onTabClick}
      size="s"
    />
  );
};

ElementSettings.propTypes = {
  element: PropTypes.object,
};
