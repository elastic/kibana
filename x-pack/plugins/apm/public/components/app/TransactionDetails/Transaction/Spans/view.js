/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { get, uniq, first, zipObject, difference, isEmpty } from 'lodash';
import Span from './Span';
import TimelineHeader from './TimelineHeader';
import { SPAN_ID } from '../../../../../../common/constants';
import { colors } from '../../../../../style/variables';
import { StickyContainer } from 'react-sticky';
import Timeline from '../../../../shared/charts/Timeline';
import EmptyMessage from '../../../../shared/EmptyMessage';
import { getFeatureDocs } from '../../../../../utils/documentation';
import { ExternalLink } from '../../../../../utils/url';
import { SpansRequest } from '../../../../../store/reactReduxRequest/spans';

const Container = styled.div`
  transition: 0.1s padding ease;
  position: relative;
  overflow: hidden;
`;

const DroppedSpansContainer = styled.div`
  border-top: 1px solid #ddd;
  height: 43px;
  line-height: 43px;
  text-align: center;
  color: ${colors.gray2};
`;

const TIMELINE_HEADER_HEIGHT = 100;
const TIMELINE_MARGINS = {
  top: TIMELINE_HEADER_HEIGHT,
  left: 50,
  right: 50,
  bottom: 0
};

class Spans extends PureComponent {
  render() {
    const { agentName, urlParams, location, droppedSpans } = this.props;
    return (
      <SpansRequest
        urlParams={urlParams}
        render={spans => {
          if (isEmpty(spans.data.spans)) {
            return (
              <EmptyMessage
                heading="No spans available for this transaction."
                hideSubheading
              />
            );
          }

          const spanTypes = uniq(
            spans.data.spanTypes.map(({ type }) => getPrimaryType(type))
          );

          const getSpanColor = getColorByType(spanTypes);

          const totalDuration = spans.data.duration;
          const spanContainerHeight = 58;
          const timelineHeight = spanContainerHeight * spans.data.spans.length;

          return (
            <div>
              <Container>
                <StickyContainer>
                  <Timeline
                    header={
                      <TimelineHeader
                        legends={spanTypes.map(type => ({
                          label: getSpanLabel(type),
                          color: getSpanColor(type)
                        }))}
                        transactionName={urlParams.transactionName}
                      />
                    }
                    duration={totalDuration}
                    height={timelineHeight}
                    margins={TIMELINE_MARGINS}
                  />
                  <div
                    style={{
                      paddingTop: TIMELINE_MARGINS.top
                    }}
                  >
                    {spans.data.spans.map(span => (
                      <Span
                        location={location}
                        timelineMargins={TIMELINE_MARGINS}
                        key={get({ span }, SPAN_ID)}
                        color={getSpanColor(getPrimaryType(span.type))}
                        span={span}
                        spanTypeLabel={getSpanLabel(getPrimaryType(span.type))}
                        totalDuration={totalDuration}
                        isSelected={get({ span }, SPAN_ID) === urlParams.spanId}
                      />
                    ))}
                  </div>
                </StickyContainer>
              </Container>

              {droppedSpans > 0 && (
                <DroppedSpansContainer>
                  {droppedSpans} spans dropped due to limit of{' '}
                  {spans.data.spans.length}.{' '}
                  <DroppedSpansDocsLink agentName={agentName} />
                </DroppedSpansContainer>
              )}
            </div>
          );
        }}
      />
    );
  }
}

function DroppedSpansDocsLink({ agentName }) {
  const docs = getFeatureDocs('dropped-spans', agentName);

  if (!docs || !docs.url) {
    return null;
  }

  return (
    <ExternalLink href={docs.url}>
      Learn more in the documentation.
    </ExternalLink>
  );
}

function getColorByType(types) {
  const assignedColors = {
    app: colors.apmBlue,
    cache: colors.apmGreen,
    components: colors.apmGreen,
    ext: colors.apmPurple,
    xhr: colors.apmPurple,
    template: colors.apmRed2,
    resource: colors.apmRed2,
    custom: colors.apmTan,
    db: colors.apmOrange,
    'hard-navigation': colors.apmYellow
  };

  const unknownTypes = difference(types, Object.keys(assignedColors));
  const unassignedColors = zipObject(unknownTypes, [
    colors.apmYellow,
    colors.apmRed,
    colors.apmBrown,
    colors.apmPink
  ]);

  return type => assignedColors[type] || unassignedColors[type];
}

function getSpanLabel(type) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return 'Navigation timing';
    default:
      return type;
  }
}

function getPrimaryType(type) {
  return first(type.split('.'));
}

Spans.propTypes = {
  agentName: PropTypes.string.isRequired,
  droppedSpans: PropTypes.number.isRequired,
  location: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};

export default Spans;
