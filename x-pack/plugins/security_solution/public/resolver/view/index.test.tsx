/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { DataAccessLayerContext } from '../data_access_layer/context';
import { ResolverWithoutDataAccessLayer } from '.';
import { mockDataAccessLayer } from '../data_access_layer/mock';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { CoreStart } from '../../../../../../src/core/public';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n/react';

describe('resolver with a fake data layer', () => {
  let reactRenderResult: RenderResult;

  beforeEach(() => {
    const dataAccessLayer = mockDataAccessLayer();
    const coreStart: CoreStart = coreMock.createStart();

    const history = createMemoryHistory();
    reactRenderResult = render(
      <I18nProvider>
        <Router history={history}>
          <KibanaContextProvider services={{ ...coreStart }}>
            <DataAccessLayerContext.Provider value={dataAccessLayer}>
              <ResolverWithoutDataAccessLayer
                databaseDocumentID="id"
                resolverComponentInstanceID="instanceID"
              />
            </DataAccessLayerContext.Provider>
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  });
  it('should render 1 resolver node', () => {
    expect(reactRenderResult.queryAllByTestId('resolverNode')).toMatchInlineSnapshot(`
      Array [
        .c1 {
        background-color: transparent;
        color: #000000;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-flow: column;
        -ms-flex-flow: column;
        flex-flow: column;
        font-size: 18.75px;
        left: 20.9%;
        line-height: 140%;
        padding: 0.25rem 0 0 0.1rem;
        position: absolute;
        top: 5%;
        width: auto;
      }

      .c2 {
        background-color: #ffffff;
        color: #343741;
        display: none;
        font-size: 0.8rem;
        font-weight: bold;
        -webkit-letter-spacing: -0.01px;
        -moz-letter-spacing: -0.01px;
        -ms-letter-spacing: -0.01px;
        letter-spacing: -0.01px;
        line-height: 1;
        margin: 0;
        padding: 4px 0 0 2px;
        text-align: left;
        text-transform: uppercase;
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c0 {
        position: absolute;
        text-align: left;
        font-size: 10px;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        box-sizing: border-box;
        border-radius: 10%;
        white-space: nowrap;
        will-change: left,top,width,height;
        contain: layout;
        min-width: 280px;
        min-height: 90px;
        overflow-y: visible;
      }

      .c0 .backing {
        stroke-dasharray: 500;
        stroke-dashoffset: 500;
        fill-opacity: 0;
      }

      .c0:hover:not([aria-current]) .backing {
        -webkit-transition-property: fill-opacity;
        transition-property: fill-opacity;
        -webkit-transition-duration: 0.25s;
        transition-duration: 0.25s;
        fill-opacity: 1;
      }

      .c0[aria-current] .backing {
        -webkit-transition-property: stroke-dashoffset;
        transition-property: stroke-dashoffset;
        -webkit-transition-duration: 1s;
        transition-duration: 1s;
        stroke-dashoffset: 0;
      }

      .c0 .euiButton {
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c0 .euiSelectableList-bordered {
        border-top-right-radius: 0px;
        border-top-left-radius: 0px;
      }

      .c0 .euiSelectableListItem {
        background-color: black;
      }

      .c0 .euiSelectableListItem path {
        fill: white;
      }

      .c0 .euiSelectableListItem__text {
        color: white;
      }

      <div
          aria-haspopup="true"
          aria-labelledby="resolver:instanceID:a:label"
          aria-level="1"
          class="c0 kbn-resetFocusState"
          data-test-subj="resolverNode"
          id="resolver:instanceID:a:node"
          role="treeitem"
          style="left: 0px; width: 0px; height: 0px;"
          tabindex="-1"
        >
          <svg
            preserveAspectRatio="xMidYMid meet"
            style="display: block; width: 100%; height: 100%; position: absolute; top: 0px; left: 0px;"
            viewBox="-15 -15 90 30"
          >
            <g>
              <use
                class="backing"
                fill="#006de40F"
                height="22.5"
                stroke="#006de4"
                width="22.5"
                x="-15.35"
                xlink:href="#resolver:instanceID:symbols:activeBacking"
                y="-15.35"
              />
              <use
                class="cube"
                height="15"
                opacity="1"
                role="presentation"
                width="15"
                x="-11.5"
                xlink:href="#resolver:instanceID:symbols:runningCube"
                y="-11.5"
              >
                <animatetransform
                  attributeName="transform"
                  attributeType="XML"
                  class="squish"
                  dur="0.2s"
                  repeatCount="1"
                  type="scale"
                  values="1 1; 1 .83; 1 .8; 1 .83; 1 1"
                />
              </use>
            </g>
          </svg>
          <div
            class="c1"
            color="#000000"
            font-size="18.75"
          >
            <div
              class="c2"
              color="#343741"
            >
              Running Process
            </div>
            <div
              class="euiButton euiButton--small"
              id="resolver:instanceID:a:label"
              style="background-color: rgb(255, 255, 255); align-self: flex-start; padding: 0px;"
              tabindex="-1"
            >
              <button
                class="euiButton euiButton--primary euiButton--small euiButton--fill"
                style="max-height: 26px; max-width: 0px;"
                tabindex="-1"
                title="c"
                type="button"
              >
                <span
                  class="euiButton__content"
                >
                  <span
                    class="euiButton__text"
                  >
                    <span
                      class="euiButton__content"
                    >
                      <span
                        class="euiButton__text"
                        data-test-subj="euiButton__text"
                      >
                        c
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <div
              class="euiFlexGroup euiFlexGroup--gutterExtraSmall euiFlexGroup--directionRow euiFlexGroup--responsive"
              style="align-self: flex-start; background: rgb(255, 255, 255); display: none; margin: 2px 0px 0px 0px; padding: 0px;"
            >
              <div
                class="euiFlexItem euiFlexItem--flexGrowZero related-dropdown"
              />
            </div>
          </div>
        </div>,
      ]
    `);
  });
});
