/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// the tooltip descriptions are located in tooltips.json

import tooltips from './tooltips.json';
import './styles/main.less';

import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import { EuiIconTip } from '@elastic/eui';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

const JsonTooltip = ({ id, position, text }) => (
  <span aria-hidden="true">
    <EuiIconTip
      content={text}
      position={position}
    />
    <span id={'ml_aria_description_' + id} className="ml-info-tooltip-text">{text}</span>
  </span>
);
JsonTooltip.propTypes = {
  id: PropTypes.string,
  position: PropTypes.string,
  text: PropTypes.string
};

// directive for placing an i icon with a popover tooltip anywhere on a page
// tooltip format: <i ml-info-icon="<the_id>" />
// the_id will match an entry in tooltips.json
module.directive('mlInfoIcon', function () {
  return {
    scope: {
      id: '@mlInfoIcon',
      position: '@'
    },
    restrict: 'AE',
    replace: false,
    link: (scope, element) => {
      const props = {
        id: scope.id,
        position: scope.position,
        text: (tooltips[scope.id]) ? tooltips[scope.id].text : ''
      };

      ReactDOM.render(
        React.createElement(JsonTooltip, props),
        element[0]
      );
    }
  };

});
