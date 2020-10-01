/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { StepScreenshotDisplay } from '../step_screenshot_display';

describe('StepScreenshotDisplayProps', () => {
  it('displays loading spinner when loading', () => {
    expect(
      shallowWithIntl(<StepScreenshotDisplay stepIndex={1} stepName="STEP_NAME" />).find(
        'EuiLoadingSpinner'
      )
    ).toMatchInlineSnapshot(`
      <EuiLoadingSpinner
        size="xl"
      />
    `);
  });

  it('displays screenshot thumbnail when present', () => {
    const wrapper = shallowWithIntl(<StepScreenshotDisplay stepIndex={1} stepName="STEP_NAME" />);
    expect(wrapper.find('img')).toMatchInlineSnapshot(`
      <img
        alt="Thumbnail screenshot for step with name STEP_NAME"
        src="data:image/jpeg;base64,SCREENSHOT_STRING"
        style={
          Object {
            "height": 360,
            "objectFit": "contain",
            "width": 640,
          }
        }
      />
    `);

    expect(wrapper.find('EuiPopover')).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="rightCenter"
        button={
          <input
            alt="Screenshot for step with name STEP_NAME"
            onClick={[Function]}
            onMouseEnter={[Function]}
            onMouseLeave={[Function]}
            src="data:image/jpeg;base64,SCREENSHOT_STRING"
            style={
              Object {
                "height": 180,
                "objectFit": "cover",
                "objectPosition": "center top",
                "width": 320,
              }
            }
            type="image"
          />
        }
        closePopover={[Function]}
        display="inlineBlock"
        hasArrow={true}
        isOpen={false}
        ownFocus={false}
        panelPaddingSize="m"
      >
        <img
          alt="Thumbnail screenshot for step with name STEP_NAME"
          src="data:image/jpeg;base64,SCREENSHOT_STRING"
          style={
            Object {
              "height": 360,
              "objectFit": "contain",
              "width": 640,
            }
          }
        />
      </EuiPopover>
    `);
  });

  it('displays No Image message when screenshot does not exist', () => {
    expect(
      shallowWithIntl(<StepScreenshotDisplay stepIndex={1} stepName="STEP_NAME" />).find('EuiText')
    ).toMatchInlineSnapshot(`
      <EuiText>
        <strong>
          <FormattedMessage
            defaultMessage="No image available"
            id="xpack.uptime.synthetics.screenshot.noImageMessage"
            values={Object {}}
          />
        </strong>
      </EuiText>
    `);
  });
});
