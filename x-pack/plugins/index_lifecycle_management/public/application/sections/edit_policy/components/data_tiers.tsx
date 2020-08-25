/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiIconTip,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
} from '@elastic/eui';

const CommentTimeLine = ({ iconType }: any) => {
  return (
    <div className="euiCommentTimeline">
      <div className="euiCommentTimeline__content">
        <div className="euiCommentTimeline__icon--default euiCommentTimeline__icon--regular">
          <EuiIcon size="l" type={iconType} />
        </div>
      </div>
    </div>
  );
};

const DetailsList = ({ details }) => {
  const groups: any[] = [];
  let items: any[];

  details.forEach((detail, index) => {
    const { name, toolTip, content } = detail;

    if (index % 3 === 0) {
      items = [];

      groups.push(<EuiFlexGroup key={groups.length}>{items}</EuiFlexGroup>);
    }

    items.push(
      <EuiFlexItem key={name}>
        <EuiDescriptionListTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>{name}</EuiFlexItem>

            <EuiFlexItem grow={false}>
              {toolTip && <EuiIconTip content={toolTip} position="top" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionListTitle>

        <EuiDescriptionListDescription>{content}</EuiDescriptionListDescription>
      </EuiFlexItem>
    );
  });

  return <EuiDescriptionList>{groups}</EuiDescriptionList>;
};

const Tier = ({
  icon,
  color,
  title,
  performance,
  cost,
  duration,
  nodes,
  indices,
  isInactive,
}: any) => {
  const details = [
    {
      name: 'Node Count',
      toolTip: 'Nodes in this tier',
      content: (
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem>23</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <div className="euiCommentEvent euiCommentEvent--regular">
      <div className="euiCommentEvent__header">
        <div className="euiCommentEvent__headerData">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiHealth color={color}>
                    <strong>{title}</strong>
                  </EuiHealth>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={`${performance} performance, ${cost} cost, duration of ${duration}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div className="euiCommentEvent__headerActions" />
      </div>
      <div className="euiCommentEvent__body">
        <DetailsList details={details} />
      </div>
    </div>
  );
};

export const DataTiers = () => {
  const [showFlyout, setShowFlyout] = useState(false);
  return (
    <>
      <EuiButtonEmpty iconType="eye" onClick={() => setShowFlyout((v) => !v)}>
        View cluster data tiers
      </EuiButtonEmpty>
      {showFlyout ? (
        <EuiFlyout onClose={() => setShowFlyout(false)}>
          <EuiFlyoutBody>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h2>Data tiers</h2>
                </EuiTitle>
                <EuiText>
                  <p>
                    How do we emphasize the sequential nature of data tiers in the UI? How do we
                    help the user differentiate between the steps? How do we give them an overview
                    of how this policy behaves?
                  </p>
                </EuiText>
              </EuiPageContentHeaderSection>
              <EuiPageContentHeaderSection />
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <div className="euiCommentList">
                <div className="euiComment euiComment--hasBody">
                  <CommentTimeLine iconType="temperature" />
                  <Tier
                    icon="temperature"
                    color="danger"
                    title="Hot tier"
                    performance="Fastest"
                    cost="highest"
                    duration="weeks"
                    nodes={4}
                    indices={12182}
                  />
                </div>

                <div className="euiComment euiComment--hasBody">
                  <CommentTimeLine iconType="cloudSunny" />
                  <Tier
                    icon="cloudSunny"
                    color="warning"
                    title="Warm tier"
                    performance="Medium to fast"
                    cost="moderate"
                    duration="weeks"
                    nodes={2}
                    indices={34552}
                  />
                </div>

                <div className="euiComment euiComment--hasBody">
                  <CommentTimeLine iconType="cloudDrizzle" />
                  <Tier
                    icon="cloudDrizzle"
                    color="primary"
                    title="Cold tier"
                    performance="Slow to fast"
                    cost="low"
                    duration="months"
                    nodes={0}
                    indices={0}
                    isInactive={true}
                  />
                </div>

                <div className="euiComment euiComment--hasBody">
                  <CommentTimeLine iconType="snowflake" />
                  <Tier
                    icon="snowflake"
                    color="default"
                    title="Frozen tier"
                    performance="Very slow"
                    cost="lowest"
                    duration="eternity"
                    nodes={1}
                    indices={786323}
                  />
                </div>
              </div>
            </EuiPageContentBody>
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </>
  );
};
