/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiTitle,
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { Datasource } from '../datasource';
import { FunctionFormList } from '../function_form_list';

const SidebarComponentUI = ({
  selectedElement,
  duplicateElement,
  elementLayer,
  elementIsSelected,
  intl,
}) => {
  const tabs = [
    {
      id: 'edit',
      name: 'Display',
      content: (
        <div className="canvasSidebar__pop">
          <EuiSpacer size="s" />
          <div className="canvasSidebar--args">
            <FunctionFormList element={selectedElement} />
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

  return (
    <div className="canvasSidebar">
      {elementIsSelected && (
        <div>
          <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.canvas.sidebar.selectedLayerTitle"
                    defaultMessage="Selected layer"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="bottom"
                        content={
                          <FormattedMessage
                            id="xpack.canvas.sidebar.moveElementToTopLayerButtonTooltip"
                            defaultMessage="Move element to top layer"
                          />
                        }
                      >
                        <EuiButtonIcon
                          color="text"
                          iconType="sortUp"
                          onClick={() => elementLayer(Infinity)}
                          aria-label={intl.formatMessage({
                            id: 'xpack.canvas.sidebar.moveElementToTopLayerButtonAriaLabel',
                            defaultMessage: 'Move element to top layer',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="bottom"
                        content={
                          <FormattedMessage
                            id="xpack.canvas.sidebar.moveElementUpOneLayerButtonTooltip"
                            defaultMessage="Move element up one layer"
                          />
                        }
                      >
                        <EuiButtonIcon
                          color="text"
                          iconType="arrowUp"
                          onClick={() => elementLayer(1)}
                          aria-label={intl.formatMessage({
                            id: 'xpack.canvas.sidebar.moveElementUpOneLayerButtonAriaLabel',
                            defaultMessage: 'Move element up one layer',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="bottom"
                        content={
                          <FormattedMessage
                            id="xpack.canvas.sidebar.moveElementDownOneLayerButtonTooltip"
                            defaultMessage="Move element down one layer"
                          />
                        }
                      >
                        <EuiButtonIcon
                          color="text"
                          iconType="arrowDown"
                          onClick={() => elementLayer(-1)}
                          aria-label={intl.formatMessage({
                            id: 'xpack.canvas.sidebar.moveElementDownOneLayerButtonAriaLabel',
                            defaultMessage: 'Move element down one layer',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="bottom"
                        content={
                          <FormattedMessage
                            id="xpack.canvas.sidebar.moveElementToBottomLayerButtonTooltip"
                            defaultMessage="Move element to bottom layer"
                          />
                        }
                      >
                        <EuiButtonIcon
                          color="text"
                          iconType="sortDown"
                          onClick={() => elementLayer(-Infinity)}
                          aria-label={intl.formatMessage({
                            id: 'xpack.canvas.sidebar.moveElementToBottomLayerButtonAriaLabel',
                            defaultMessage: 'Move element to bottom layer',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="bottom"
                        content={
                          <FormattedMessage
                            id="xpack.canvas.sidebar.duplicateElementIntoNewLayerButtonTooltip"
                            defaultMessage="Duplicate this element into a new layer"
                          />
                        }
                      >
                        <EuiButtonIcon
                          color="text"
                          iconType="copy"
                          onClick={() => duplicateElement()}
                          aria-label={intl.formatMessage({
                            id: 'xpack.canvas.sidebar.duplicateElementIntoNewLayerButtonAriaLabel',
                            defaultMessage: 'Duplicate this element into a new layer',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </div>
      )}
    </div>
  );
};

SidebarComponentUI.propTypes = {
  selectedElement: PropTypes.object,
  duplicateElement: PropTypes.func.isRequired,
  elementLayer: PropTypes.func,
  elementIsSelected: PropTypes.bool.isRequired,
};

export const SidebarComponent = injectI18n(SidebarComponentUI);
