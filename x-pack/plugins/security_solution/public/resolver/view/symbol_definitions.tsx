/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useSymbolIDs } from './use_symbol_ids';
import { usePaintServerIDs } from './use_paint_server_ids';

const loadingProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.loadingProcess',
  {
    defaultMessage: 'Loading Process',
  }
);

const errorProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.errorProcess',
  {
    defaultMessage: 'Error Process',
  }
);

const runningProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.runningProcess',
  {
    defaultMessage: 'Running Process',
  }
);

const triggerProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.triggerProcess',
  {
    defaultMessage: 'Trigger Process',
  }
);

const terminatedProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.terminatedProcess',
  {
    defaultMessage: 'Terminated Process',
  }
);

const terminatedTriggerProcessTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.terminatedTriggerProcess',
  {
    defaultMessage: 'Terminated Trigger Process',
  }
);

const hoveredProcessBackgroundTitle = i18n.translate(
  'xpack.securitySolution.resolver.symbolDefinitions.hoveredProcessBackground',
  {
    defaultMessage: 'Hovered Process Background',
  }
);
/**
 * PaintServers: Where color palettes, gradients, patterns and other similar concerns
 * are exposed to the component
 */
const PaintServers = memo(({ isDarkMode }: { isDarkMode: boolean }) => {
  const paintServerIDs = usePaintServerIDs();
  return (
    <>
      <linearGradient
        id={paintServerIDs.errorCube}
        x1="10.2372"
        y1="9.49068"
        x2="46.5307"
        y2="45.7844"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#6D6D6D" />
        <stop offset="1" stopColor="#B9B9B9" />
      </linearGradient>
      <linearGradient
        id={paintServerIDs.runningProcessCube}
        x1="-381.23556"
        y1="264.73802"
        x2="-380.48514"
        y2="263.8816"
        gradientTransform="matrix(70.05179, 0, 0, -79.94774, 26724.01618, 21181.09848)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.00087" stopColor="#006bb4" />
        <stop offset="1" stopColor="#54b399" />
      </linearGradient>
      <linearGradient
        id={paintServerIDs.runningTriggerCube}
        x1="-381.18643"
        y1="264.68195"
        x2="-380.48514"
        y2="263.8816"
        gradientTransform="matrix(70.05179, 0, 0, -79.94774, 26724.01618, 21181.09848)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#dd0a73" />
        <stop offset="1" stopColor="#f66" />
      </linearGradient>
      {isDarkMode ? (
        <>
          <linearGradient
            id={paintServerIDs.terminatedProcessCube}
            x1="-381.23752"
            y1="264.24026"
            x2="-380.48514"
            y2="263.3816"
            gradientTransform="matrix(70.05178, 0, 0, -79.94771, 26724.01313, 21140.72096)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#4c82c3" />
            <stop offset="1" stopColor="#8bd1c7" />
          </linearGradient>
          <linearGradient
            id={paintServerIDs.terminatedTriggerCube}
            x1="-381.18658"
            y1="264.68187"
            x2="-380.48546"
            y2="263.8817"
            gradientTransform="matrix(70.05179, 0, 0, -79.94774, 26724.01618, 21181.09848)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#dd0a73" />
            <stop offset="1" stopColor="#f66" />
          </linearGradient>
        </>
      ) : (
        <>
          <linearGradient
            id={paintServerIDs.terminatedProcessCube}
            x1="10.5206"
            y1="9.49068"
            x2="46.8141"
            y2="45.7844"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#2F6EB6" />
            <stop offset="1" stopColor="#00B4AC" />
          </linearGradient>
          <linearGradient
            id={paintServerIDs.terminatedTriggerCube}
            x1="15.4848"
            y1="12.0468"
            x2="43.1049"
            y2="47.2331"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#DD0A73" />
            <stop offset="1" stopColor="#FF6666" />
          </linearGradient>
        </>
      )}
    </>
  );
});

/**
 * Defs entries that define shapes, masks and other spatial elements
 */
const SymbolsAndShapes = memo(({ isDarkMode }: { isDarkMode: boolean }) => {
  const symbolIDs = useSymbolIDs();
  const paintServerIDs = usePaintServerIDs();
  return (
    <>
      <symbol
        id={symbolIDs.processNodeLabel}
        viewBox="0 0 144 25"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x="1"
          y="1"
          width="142"
          height="23"
          fill="inherit"
          strokeWidth="0"
          paintOrder="normal"
        />
      </symbol>
      <symbol id={symbolIDs.loadingCube} viewBox="0 0 88 100">
        <title>{loadingProcessTitle}</title>
        <path
          d="M87.52127,25.129a3.79536,3.79536,0,0,0-1.43184-1.47165L45.91025.57471a3.83652,3.83652,0,0,0-3.8205,0L1.91039,23.65739A3.86308,3.86308,0,0,0,0,26.95V73.11541a3.79835,3.79835,0,0,0,1.9104,3.2925L42.08975,99.49067a3.83691,3.83691,0,0,0,3.8205,0L86.08943,76.40791A3.79852,3.79852,0,0,0,88,73.11541V26.95A3.77641,3.77641,0,0,0,87.52127,25.129Z"
          fill={isDarkMode ? '#1d1e24' : 'white'}
          stroke="#98A2B3"
          strokeWidth="2"
        />
      </symbol>
      <symbol id={symbolIDs.errorCube} viewBox="0 0 88 100">
        <title>{errorProcessTitle}</title>
        <path
          d="M87.52127,25.129a3.79536,3.79536,0,0,0-1.43184-1.47165L45.91025.57471a3.83652,3.83652,0,0,0-3.8205,0L1.91039,23.65739A3.86308,3.86308,0,0,0,0,26.95V73.11541a3.79835,3.79835,0,0,0,1.9104,3.2925L42.08975,99.49067a3.83691,3.83691,0,0,0,3.8205,0L86.08943,76.40791A3.79852,3.79852,0,0,0,88,73.11541V26.95A3.77641,3.77641,0,0,0,87.52127,25.129Z"
          transform="translate(0.00001 0)"
          fill={`url(#${paintServerIDs.errorCube})`}
        />
        <g opacity="0.6">
          <path
            opacity={0.6}
            d="M87.52113,24.73352a3.7956,3.7956,0,0,0-1.43182-1.47166L45.91012.17918a3.8365,3.8365,0,0,0-3.82049,0L1.91029,23.26186A3.86312,3.86312,0,0,0-.00009,26.55445V72.7199a3.79834,3.79834,0,0,0,1.91041,3.29249L42.08963,99.09514a3.83689,3.83689,0,0,0,3.82049,0L86.08931,76.01239a3.79852,3.79852,0,0,0,1.91056-3.29249V26.55445A3.77643,3.77643,0,0,0,87.52113,24.73352Z"
            transform="translate(0.00013 0.39551)"
            fill={`url(#${paintServerIDs.errorCube})`}
          />
          <path
            opacity={0.4}
            d="M.57134,24.52282a3.79906,3.79906,0,0,1,1.34824-1.32625L42.09878.11387a3.83708,3.83708,0,0,1,3.8208,0L86.09877,23.19655a3.79771,3.79771,0,0,1,1.43182,1.47165L44.00909,49.57182Z"
            transform="translate(0.00013 0.39551)"
            fill="#fff"
            style={{ isolation: 'isolate' }}
          />
          <path
            opacity={0.4}
            d="M43.99972,49.63713V99.60449a3.83406,3.83406,0,0,1-1.91025-.50932L1.91029,76.01239A3.79835,3.79835,0,0,1-.00013,72.7199V26.55445A3.77431,3.77431,0,0,1,.562,24.5882Z"
            transform="translate(0.00013 0.39551)"
            fill="#353944"
            style={{ isolation: 'isolate' }}
          />
        </g>
      </symbol>
      <symbol id={symbolIDs.runningProcessCube} viewBox="0 0 88 100">
        <title>{runningProcessTitle}</title>
        <path
          d="M87.52127,25.129a3.79536,3.79536,0,0,0-1.43184-1.47165L45.91025.57471a3.83652,3.83652,0,0,0-3.8205,0L1.91039,23.65739A3.86308,3.86308,0,0,0,0,26.95V73.11541a3.79835,3.79835,0,0,0,1.9104,3.2925L42.08975,99.49067a3.83691,3.83691,0,0,0,3.8205,0L86.08943,76.40791A3.79852,3.79852,0,0,0,88,73.11541V26.95A3.77641,3.77641,0,0,0,87.52127,25.129Z"
          transform="translate(0.00001 0)"
          fill={`url(#${paintServerIDs.runningProcessCube})`}
        />
        <g opacity="0.5">
          <path
            d="M59.18326,40.255,44.93983,32.07224a1.7853,1.7853,0,0,0-1.77779,0L28.91861,40.255a1.77022,1.77022,0,0,0-.64527.64058L44.0088,49.96977,59.838,40.91219a1.77,1.77,0,0,0-.65469-.65719Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M59.18326,40.255,44.93983,32.07224a1.7853,1.7853,0,0,0-1.77779,0L28.91861,40.255a1.77022,1.77022,0,0,0-.64527.64058L44.0088,49.96977,59.838,40.91219a1.77,1.77,0,0,0-.65469-.65719Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
          <path
            d="M28.27334,40.89555a1.75837,1.75837,0,0,0-.24347.89149V58.1525a1.76751,1.76751,0,0,0,.88874,1.532L43.162,67.86729a1.77951,1.77951,0,0,0,.84679.2316V49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M28.27334,40.89555a1.75837,1.75837,0,0,0-.24347.89149V58.1525a1.76751,1.76751,0,0,0,.88874,1.532L43.162,67.86729a1.77951,1.77951,0,0,0,.84679.2316V49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
          <path
            d="M44.0088,68.0989a1.7772,1.7772,0,0,0,.931-.2316l14.24344-8.18274a1.76754,1.76754,0,0,0,.889-1.532V41.787a1.76037,1.76037,0,0,0-.23432-.87485L44.0088,49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M44.0088,68.0989a1.7772,1.7772,0,0,0,.931-.2316l14.24344-8.18274a1.76754,1.76754,0,0,0,.889-1.532V41.787a1.76037,1.76037,0,0,0-.23432-.87485L44.0088,49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
        </g>
        <path
          d="M.57144,24.91834a3.79909,3.79909,0,0,1,1.34825-1.32625L42.0989.50939a3.837,3.837,0,0,1,3.82081,0L86.09892,23.59206a3.79782,3.79782,0,0,1,1.4318,1.47169L44.00915,49.96733Z"
          transform="translate(0.00001 0)"
          fill="#fff"
          opacity="0.3"
          style={{ isolation: 'isolate' }}
        />
        <path
          d="M43.99984,50.03265V100a3.83392,3.83392,0,0,1-1.91024-.50933L1.91039,76.40791A3.79835,3.79835,0,0,1,0,73.11541V26.95a3.77423,3.77423,0,0,1,.56216-1.96625Z"
          transform="translate(0.00001 0)"
          fill="#353944"
          opacity="0.2"
          style={{ isolation: 'isolate' }}
        />
      </symbol>
      <symbol id={symbolIDs.runningTriggerCube} viewBox="0 0 88 100">
        <title>{triggerProcessTitle}</title>
        <path
          d="M87.52127,25.129a3.79536,3.79536,0,0,0-1.43184-1.47165L45.91025.57471a3.83652,3.83652,0,0,0-3.8205,0L1.91039,23.65739A3.86308,3.86308,0,0,0,0,26.95V73.11541a3.79835,3.79835,0,0,0,1.9104,3.2925L42.08975,99.49067a3.83691,3.83691,0,0,0,3.8205,0L86.08943,76.40791A3.79852,3.79852,0,0,0,88,73.11541V26.95A3.77641,3.77641,0,0,0,87.52127,25.129Z"
          transform="translate(0.00001 0)"
          fill={`url(#${paintServerIDs.runningTriggerCube})`}
        />
        <g opacity="0.5">
          <path
            d="M59.18326,40.255,44.93983,32.07224a1.7853,1.7853,0,0,0-1.77779,0L28.91861,40.255a1.77022,1.77022,0,0,0-.64527.64058L44.0088,49.96977,59.838,40.91219a1.77,1.77,0,0,0-.65469-.65719Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M59.18326,40.255,44.93983,32.07224a1.7853,1.7853,0,0,0-1.77779,0L28.91861,40.255a1.77022,1.77022,0,0,0-.64527.64058L44.0088,49.96977,59.838,40.91219a1.77,1.77,0,0,0-.65469-.65719Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
          <path
            d="M28.27334,40.89555a1.75837,1.75837,0,0,0-.24347.89149V58.1525a1.76751,1.76751,0,0,0,.88874,1.532L43.162,67.86729a1.77951,1.77951,0,0,0,.84679.2316V49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M28.27334,40.89555a1.75837,1.75837,0,0,0-.24347.89149V58.1525a1.76751,1.76751,0,0,0,.88874,1.532L43.162,67.86729a1.77951,1.77951,0,0,0,.84679.2316V49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
          <path
            d="M44.0088,68.0989a1.7772,1.7772,0,0,0,.931-.2316l14.24344-8.18274a1.76754,1.76754,0,0,0,.889-1.532V41.787a1.76037,1.76037,0,0,0-.23432-.87485L44.0088,49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
          />
          <path
            d="M44.0088,68.0989a1.7772,1.7772,0,0,0,.931-.2316l14.24344-8.18274a1.76754,1.76754,0,0,0,.889-1.532V41.787a1.76037,1.76037,0,0,0-.23432-.87485L44.0088,49.96977Z"
            transform="translate(0.00001 0)"
            fill="#fff"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
        </g>
        <path
          d="M.57144,24.91834a3.79909,3.79909,0,0,1,1.34825-1.32625L42.0989.50939a3.837,3.837,0,0,1,3.82081,0L86.09892,23.59206a3.79782,3.79782,0,0,1,1.4318,1.47169L44.00915,49.96733Z"
          transform="translate(0.00001 0)"
          fill="#fff"
          opacity="0.3"
          style={{ isolation: 'isolate' }}
        />
        <path
          d="M43.99984,50.03265V100a3.83392,3.83392,0,0,1-1.91024-.50933L1.91039,76.40791A3.79835,3.79835,0,0,1,0,73.11541V26.95a3.77423,3.77423,0,0,1,.56216-1.96625Z"
          transform="translate(0.00001 0)"
          fill="#353944"
          opacity="0.2"
          style={{ isolation: 'isolate' }}
        />
      </symbol>
      <symbol viewBox="0 0 88 100" id={symbolIDs.terminatedProcessCube}>
        <title>{terminatedProcessTitle}</title>
        <path
          d="M87.52113,24.73352a3.7956,3.7956,0,0,0-1.43182-1.47166L45.91012.17918a3.8365,3.8365,0,0,0-3.82049,0L1.91029,23.26186A3.86312,3.86312,0,0,0-.00009,26.55445V72.7199a3.79834,3.79834,0,0,0,1.91041,3.29249L42.08963,99.09514a3.83689,3.83689,0,0,0,3.82049,0L86.08931,76.01239a3.79852,3.79852,0,0,0,1.91056-3.29249V26.55445A3.77643,3.77643,0,0,0,87.52113,24.73352Z"
          transform="translate(0.00013 0.39551)"
          fill={isDarkMode ? '#010101' : '#fff'}
        />
        <g opacity="0.7">
          <path
            opacity={isDarkMode ? 1 : 0.6}
            d="M87.52113,24.73352a3.7956,3.7956,0,0,0-1.43182-1.47166L45.91012.17918a3.8365,3.8365,0,0,0-3.82049,0L1.91029,23.26186A3.86312,3.86312,0,0,0-.00009,26.55445V72.7199a3.79834,3.79834,0,0,0,1.91041,3.29249L42.08963,99.09514a3.83689,3.83689,0,0,0,3.82049,0L86.08931,76.01239a3.79852,3.79852,0,0,0,1.91056-3.29249V26.55445A3.77643,3.77643,0,0,0,87.52113,24.73352Z"
            transform="translate(0.00013 0.39551)"
            fill={`url(#${paintServerIDs.terminatedProcessCube})`}
          />
          <path
            opacity={isDarkMode ? 0.3 : 0.4}
            d="M.57134,24.52282a3.79906,3.79906,0,0,1,1.34824-1.32625L42.09878.11387a3.83708,3.83708,0,0,1,3.8208,0L86.09877,23.19655a3.79771,3.79771,0,0,1,1.43182,1.47165L44.00909,49.57182Z"
            transform="translate(0.00013 0.39551)"
            fill="#fff"
            style={{ isolation: 'isolate' }}
          />
          <path
            opacity={isDarkMode ? 0.2 : 0.4}
            d="M43.99972,49.63713V99.60449a3.83406,3.83406,0,0,1-1.91025-.50932L1.91029,76.01239A3.79835,3.79835,0,0,1-.00013,72.7199V26.55445A3.77431,3.77431,0,0,1,.562,24.5882Z"
            transform="translate(0.00013 0.39551)"
            fill="#353944"
            style={{ isolation: 'isolate' }}
          />
        </g>
      </symbol>
      <symbol id={symbolIDs.terminatedTriggerCube} viewBox="0 0 88 100">
        <title>{terminatedTriggerProcessTitle}</title>
        {isDarkMode && (
          <path
            opacity="1"
            d="M87.52143,25.06372a3.795,3.795,0,0,0-1.43129-1.47166L45.92578.50939a3.83384,3.83384,0,0,0-3.81907,0L1.94219,23.59206A3.8634,3.8634,0,0,0,.03252,26.88465V73.05008a3.7986,3.7986,0,0,0,1.90971,3.2925L42.10671,99.42532a3.83423,3.83423,0,0,0,3.81907,0L86.09014,76.34258A3.79881,3.79881,0,0,0,88,73.05008V26.88465A3.77748,3.77748,0,0,0,87.52143,25.06372Z"
            transform="translate(0)"
            fill="#010101"
          />
        )}
        <g opacity="0.6">
          {!isDarkMode && (
            <path
              opacity="0.6"
              d="M87.52143,25.06372a3.795,3.795,0,0,0-1.43129-1.47166L45.92578.50939a3.83384,3.83384,0,0,0-3.81907,0L1.94219,23.59206A3.8634,3.8634,0,0,0,.03252,26.88465V73.05008a3.7986,3.7986,0,0,0,1.90971,3.2925L42.10671,99.42532a3.83423,3.83423,0,0,0,3.81907,0L86.09014,76.34258A3.79881,3.79881,0,0,0,88,73.05008V26.88465A3.77748,3.77748,0,0,0,87.52143,25.06372Z"
              transform="translate(0)"
              fill="#010101"
            />
          )}
          <path
            opacity={isDarkMode ? 1 : 0.604}
            d="M87.48893,25.129a3.79468,3.79468,0,0,0-1.4313-1.47165L45.89329.57472a3.83381,3.83381,0,0,0-3.81908,0L1.90969,23.65739A3.86331,3.86331,0,0,0,0,26.95V73.11541a3.79859,3.79859,0,0,0,1.90969,3.2925L42.07421,99.49067a3.83425,3.83425,0,0,0,3.81908,0L86.05763,76.40791a3.79876,3.79876,0,0,0,1.90985-3.2925V26.95A3.77746,3.77746,0,0,0,87.48893,25.129Z"
            transform="translate(0)"
            fill={`url(#${paintServerIDs.terminatedTriggerCube})`}
          />
          <path
            d="M.57124,24.91834A3.79833,3.79833,0,0,1,1.919,23.59209L42.08335.50939a3.83441,3.83441,0,0,1,3.8194,0L86.06711,23.59206a3.7972,3.7972,0,0,1,1.43128,1.47169L43.99289,49.96733Z"
            transform="translate(0)"
            fill="#fff"
            opacity="0.3"
            style={{ isolation: 'isolate' }}
          />
          <path
            d="M43.98359,50.03265V100a3.83139,3.83139,0,0,1-1.90953-.50933L1.90969,76.40791A3.79859,3.79859,0,0,1,0,73.11541V26.95a3.77523,3.77523,0,0,1,.56195-1.96625Z"
            transform="translate(0)"
            fill="#353944"
            opacity="0.2"
            style={{ isolation: 'isolate' }}
          />
        </g>
      </symbol>
      <symbol viewBox="0 -3 88 106" id={symbolIDs.processCubeActiveBacking}>
        <title>{hoveredProcessBackgroundTitle}</title>
        <path
          d="m87.521 25.064a3.795 3.795 0 0 0-1.4313-1.4717l-40.164-23.083a3.8338 3.8338 0 0 0-3.8191 0l-40.165 23.083a3.8634 3.8634 0 0 0-1.9097 3.2926v46.165a3.7986 3.7986 0 0 0 1.9097 3.2925l40.164 23.083a3.8342 3.8342 0 0 0 3.8191 0l40.164-23.083a3.7988 3.7988 0 0 0 1.9099-3.2925v-46.165a3.7775 3.7775 0 0 0-0.47857-1.8209z"
          strokeWidth="2"
        />
      </symbol>
    </>
  );
});

/**
 * This `<defs>` element is used to define the reusable assets for the Resolver
 * It confers several advantages, including but not limited to:
 *  1. Freedom of form for creative assets (beyond box-model constraints)
 *  2. Separation of concerns between creative assets and more functional areas of the app
 *  3. `<use>` elements can be handled by compositor (faster)
 */
export const SymbolDefinitions = memo(() => {
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  return (
    <HiddenSVG>
      <defs>
        <PaintServers isDarkMode={isDarkMode} />
        <SymbolsAndShapes isDarkMode={isDarkMode} />
      </defs>
    </HiddenSVG>
  );
});

const HiddenSVG = styled('svg')`
  position: absolute;
  left: 100%;
  top: 100%;
  width: 0;
  height: 0;
`;
