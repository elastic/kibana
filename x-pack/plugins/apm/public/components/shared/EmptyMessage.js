/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { units, px, fontSizes, fontSize } from '../../style/variables';
import { get } from 'lodash';
import { KuiTableInfo } from '@kbn/ui-framework/components';
import { APM_DOCS } from '../../utils/documentation';
import { ExternalLink } from '../../utils/url';

const Container = styled(KuiTableInfo)`
  text-align: center;
  font-size: ${fontSizes.large};
`;

const HelpMessage = styled.div`
  text-align: center;
  font-size: ${fontSize};
  margin-top: ${px(units.half)};
`;

function EmptyMessage({ heading, subheading, hideSubheading }) {
  if (!subheading) {
    subheading = (
      <Fragment>
        {
          " Oops! You should try another time range. If that's no good, there's always the "
        }
        <ExternalLink href={get(APM_DOCS, 'get-started.url')}>
          documentation.
        </ExternalLink>
      </Fragment>
    );
  }

  return (
    <Container>
      {heading || 'No data found.'}
      {!hideSubheading && (
        <HelpMessage>
          <span>{subheading}</span>
        </HelpMessage>
      )}
    </Container>
  );
}

EmptyMessage.propTypes = {
  heading: PropTypes.string,
  hideSubheading: PropTypes.bool
};

EmptyMessage.defaultProps = {
  hideSubheading: false
};

export default EmptyMessage;
