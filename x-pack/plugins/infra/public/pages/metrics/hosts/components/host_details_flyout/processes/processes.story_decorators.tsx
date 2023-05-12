/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryContext } from '@storybook/react';
import React from 'react';
// This should be fixed when the component is moved as embeddable
// eslint-disable-next-line import/no-extraneous-dependencies
import { useParameter } from '@storybook/addons';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SourceProvider } from '../../../../../../containers/metrics_source';

export const DecorateWithKibanaContext = <StoryFnReactReturnType extends React.ReactNode>(
  wrappedStory: () => StoryFnReactReturnType,
  _storyContext: StoryContext
) => {
  const processes = {
    processList: [
      {
        cpu: 0.02466666666666667,
        memory: 0.026166666666666668,
        startTime: 1683624717239,
        pid: 757,
        state: 'running',
        user: 'test_user',
        command: '/Applications/Firefox.app/Contents/MacOS/firefox',
      },
      {
        cpu: 0.006833333333333334,
        memory: 0.07200000000000001,
        startTime: 1683624734638,
        pid: 3524,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin) --ms-enable-electron-run-as-node --max-old-space-size=4096 /Users/test_user/projects/forks/kibana/node_modules/typescript/lib/tsserver.js --useInferredProjectPerProjectRoot --enableTelemetry --cancellationPipeName /var/folders/hq/pz_mbrf55lg_r37lr3l0n6nr0000gn/T/vscode-typescript501/b23862414d9a371466ef/tscancellation-9cbfb32954f6e79a5287.tmp* --locale en --noGetErrOnBackgroundUpdate --validateDefaultNpmLocation --useNodeIpc',
      },
      {
        cpu: 0.006666666666666667,
        memory: 0.012000000000000002,
        startTime: 1683633422827,
        pid: 12355,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Firefox.app/Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container -childID 20 -isForBrowser -prefsLen 29966 -prefMapSize 241364 -jsInitLen 240056 -sbStartup -sbAppPath /Applications/Firefox.app -sbLevel 3 -sbAllowAudio -parentBuildID 20230424110519 -appDir /Applications/Firefox.app/Contents/Resources/browser -profile /Users/test_user/Library/Application Support/Firefox/Profiles/rqulcocl.default-release {c336b12a-302b-46a0-9c9d-d9f1a22b24b9} 757 gecko-crash-server-pipe.757 org.mozilla.machname.1351433086 tab',
      },
      {
        cpu: 0.0030000000000000005,
        memory: 0.014,
        startTime: 1683625026636,
        pid: 6474,
        state: 'running',
        user: 'test_user',
        command:
          '/Users/test_user/.vscode/extensions/ambar.bundle-size-1.5.0/node_modules/esbuild-darwin-arm64/bin/esbuild --service=0.15.18 --ping',
      },
      {
        cpu: 0.0025,
        memory: 0.016,
        startTime: 1683624729210,
        pid: 3034,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Renderer).app/Contents/MacOS/Code Helper (Renderer) --type=renderer --user-data-dir=/Users/test_user/Library/Application Support/Code --standard-schemes=vscode-webview,vscode-file --secure-schemes=vscode-webview,vscode-file --bypasscsp-schemes --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --streaming-schemes --app-path=/Applications/Visual Studio Code.app/Contents/Resources/app --no-sandbox --no-zygote --enable-blink-features=HighlightAPI --lang=en-GB --num-raster-threads=4 --enable-zero-copy --enable-gpu-memory-buffer-compositor-resources --enable-main-frame-before-activation --renderer-client-id=8 --launch-time-ticks=267710381 --shared-files --field-trial-handle=1718379636,r,13842708672762445701,9157690858550926405,131072 --disable-features=CalculateNativeWinOcclusion,SpareRendererForSitePerProcess --vscode-window-config=vscode:c40ae943-cf5f-4b4e-9ede-714d3202da26',
      },
      {
        cpu: 0.0013333333333333333,
        memory: 0.011666666666666667,
        startTime: 1683628721310,
        pid: 11385,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Slack.app/Contents/Frameworks/Slack Helper (Renderer).app/Contents/MacOS/Slack Helper (Renderer) --type=renderer --user-data-dir=/Users/test_user/Library/Application Support/Slack --standard-schemes=app,slack-webapp-dev --enable-sandbox --secure-schemes=app,slack-webapp-dev --bypasscsp-schemes=slack-webapp-dev --cors-schemes=slack-webapp-dev --fetch-schemes=slack-webapp-dev --service-worker-schemes=slack-webapp-dev --streaming-schemes --app-path=/Applications/Slack.app/Contents/Resources/app.asar --enable-sandbox --enable-blink-features=ExperimentalJSProfiler --disable-blink-features --first-renderer-process --autoplay-policy=no-user-gesture-required --enable-logging --force-color-profile=srgb --log-file=/Users/test_user/Library/Application Support/Slack/logs/default/electron_debug.log --lang=en-GB --num-raster-threads=4 --enable-zero-copy --enable-gpu-memory-buffer-compositor-resources --enable-main-frame-before-activation --renderer-client-id=4 --time-ticks-at-unix-epoch=-1683624461530404 --launch-time-ticks=4259772827 --shared-files --field-trial-handle=1718379636,r,7616643094726622586,3291986448361336128,131072 --disable-features=AllowAggressiveThrottlingWithWebSocket,CalculateNativeWinOcclusion,HardwareMediaKeyHandling,IntensiveWakeUpThrottling,LogJsConsoleMessages,RequestInitiatorSiteLockEnfocement,SpareRendererForSitePerProcess,WebRtcHideLocalIpsWithMdns,WinRetrieveSuggestionsOnlyOnDemand --window-type=main --seatbelt-client=71',
      },
      {
        cpu: 0.0013333333333333333,
        memory: 0.0105,
        startTime: 1683624737323,
        pid: 3593,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin) --ms-enable-electron-run-as-node /Users/test_user/.vscode/extensions/streetsidesoftware.code-spell-checker-2.20.4/packages/_server/dist/main.js --node-ipc --clientProcessId=3508',
      },
      {
        cpu: 0.0011666666666666668,
        memory: 0.014666666666666668,
        startTime: 1683625569286,
        pid: 8319,
        state: 'running',
        user: 'test_user',
        command:
          '/Applications/Firefox.app/Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container -childID 14 -isForBrowser -prefsLen 29644 -prefMapSize 241364 -jsInitLen 240056 -sbStartup -sbAppPath /Applications/Firefox.app -sbLevel 3 -sbAllowAudio -parentBuildID 20230424110519 -appDir /Applications/Firefox.app/Contents/Resources/browser -profile /Users/test_user/Library/Application Support/Firefox/Profiles/rqulcocl.default-release {49cd6e6d-ed04-4355-8a7c-9a13fb9cbfa8} 757 gecko-crash-server-pipe.757 org.mozilla.machname.1880877485 tab',
      },
      {
        cpu: 0.001,
        memory: 0.0030000000000000005,
        startTime: 1683627994731,
        pid: 10269,
        state: 'running',
        user: 'test_user',
        command: './metricbeat -v -e -c metricbeat.dev.yml',
      },
      {
        cpu: 0.001,
        memory: 0.006000000000000001,
        startTime: 1683624717742,
        pid: 784,
        state: 'running',
        user: 'test_user',
        command: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
      },
    ],
  };

  const summary = { summary: { running: 366, total: 366 } };

  const contentTypes = {
    processesAndSummary: { ...processes, ...summary, loading: false },
    onlyProcesses: { ...processes, summary: {}, loading: false },
    onlySummary: { ...summary, processList: [] },
    loading: { loading: true },
    noData: { loading: false, summary: {}, processList: [] },
  };

  const initialProcesses = useParameter<{ contentType: keyof typeof contentTypes }>('show', {
    contentType: 'processesAndSummary',
  })!;

  const mockServices = {
    http: {
      basePath: {
        prepend: (_: string) => '',
      },
      patch: () => {},
      fetch: async (path: string) => {
        switch (path) {
          case '/api/metrics/process_list':
            return contentTypes[initialProcesses?.contentType];
          default:
            return {};
        }
      },
    },
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <SourceProvider sourceId="default">{wrappedStory()} </SourceProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
