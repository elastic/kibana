/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import * as reactUse from 'react-use';
import { StepScreenshotDisplay } from '../step_screenshot_display';

describe('StepScreenshotDisplayProps', () => {
  // @ts-ignore missing fields don't matter in this test, the component in question only relies on `isIntersecting`
  jest.spyOn(reactUse, 'useIntersection').mockImplementation(() => ({
    isIntersecting: true,
  }));

  it('displays screenshot thumbnail when present', () => {
    const wrapper = mountWithIntl(
      <StepScreenshotDisplay
        checkGroup="check_group"
        screenshotExists={true}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );

    wrapper.update();

    expect(wrapper.find('img')).toMatchInlineSnapshot(`null`);

    expect(wrapper.find('EuiPopover')).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="rightCenter"
        button={
          <input
            alt="Screenshot for step with name \\"STEP_NAME\\""
            onClick={[Function]}
            onMouseEnter={[Function]}
            onMouseLeave={[Function]}
            src="/api/uptime/journey/screenshot/check_group/1"
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
        <EuiOutsideClickDetector
          isDisabled={true}
          onOutsideClick={[Function]}
        >
          <div
            className="euiPopover euiPopover--anchorRightCenter"
            onKeyDown={[Function]}
            onMouseDown={[Function]}
            onMouseUp={[Function]}
            onTouchEnd={[Function]}
            onTouchStart={[Function]}
          >
            <div
              className="euiPopover__anchor"
            >
              <input
                alt="Screenshot for step with name \\"STEP_NAME\\""
                onClick={[Function]}
                onMouseEnter={[Function]}
                onMouseLeave={[Function]}
                src="/api/uptime/journey/screenshot/check_group/1"
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
            </div>
          </div>
        </EuiOutsideClickDetector>
      </EuiPopover>
    `);
  });

  it('uses alternative text when step name not available', () => {
    const wrapper = mountWithIntl(
      <StepScreenshotDisplay checkGroup="check_group" screenshotExists={true} stepIndex={1} />
    );

    wrapper.update();

    expect(wrapper.find('EuiPopover')).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="rightCenter"
        button={
          <input
            alt="Screenshot"
            onClick={[Function]}
            onMouseEnter={[Function]}
            onMouseLeave={[Function]}
            src="/api/uptime/journey/screenshot/check_group/1"
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
        <EuiOutsideClickDetector
          isDisabled={true}
          onOutsideClick={[Function]}
        >
          <div
            className="euiPopover euiPopover--anchorRightCenter"
            onKeyDown={[Function]}
            onMouseDown={[Function]}
            onMouseUp={[Function]}
            onTouchEnd={[Function]}
            onTouchStart={[Function]}
          >
            <div
              className="euiPopover__anchor"
            >
              <input
                alt="Screenshot"
                onClick={[Function]}
                onMouseEnter={[Function]}
                onMouseLeave={[Function]}
                src="/api/uptime/journey/screenshot/check_group/1"
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
            </div>
          </div>
        </EuiOutsideClickDetector>
      </EuiPopover>
    `);
  });

  it('displays No Image message when screenshot does not exist', () => {
    expect(
      shallowWithIntl(
        <StepScreenshotDisplay
          checkGroup="check_group"
          stepIndex={1}
          stepName="STEP_NAME"
          screenshotExists={false}
        />
      ).find('EuiText')
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
