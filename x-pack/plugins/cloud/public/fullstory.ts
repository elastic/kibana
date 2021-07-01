/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { IBasePath, PackageInfo } from '../../../../src/core/public';

export interface FullStoryDeps {
  basePath: IBasePath;
  orgId: string;
  packageInfo: PackageInfo;
  userId?: string;
}

interface FullStoryApi {
  identify(userId: string, userVars?: Record<string, any>): void;
  event(eventName: string, eventProperties: Record<string, any>): void;
}

export const initializeFullStory = async ({
  basePath,
  orgId,
  packageInfo,
  userId,
}: FullStoryDeps) => {
  // @ts-expect-error
  window._fs_debug = false;
  // @ts-expect-error
  window._fs_host = 'fullstory.com';
  // @ts-expect-error
  window._fs_script = basePath.prepend(`/internal/cloud/${packageInfo.buildNum}/fullstory.js`);
  // @ts-expect-error
  window._fs_org = orgId;
  // @ts-expect-error
  window._fs_namespace = 'FSKibana';

  /* eslint-disable */
  (function(m,n,e,t,l,o,g,y){
      if (e in m) {if(m.console && m.console.log) { m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].');} return;}
      // @ts-expect-error
      g=m[e]=function(a,b,s){g.q?g.q.push([a,b,s]):g._api(a,b,s);};g.q=[];
      // @ts-expect-error
      o=n.createElement(t);o.async=1;o.crossOrigin='anonymous';o.src=_fs_script;
      // @ts-expect-error
      y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);
      // @ts-expect-error
      g.identify=function(i,v,s){g(l,{uid:i},s);if(v)g(l,v,s)};g.setUserVars=function(v,s){g(l,v,s)};g.event=function(i,v,s){g('event',{n:i,p:v},s)};
      // @ts-expect-error
      g.anonymize=function(){g.identify(!!0)};
      // @ts-expect-error
      g.shutdown=function(){g("rec",!1)};g.restart=function(){g("rec",!0)};
      // @ts-expect-error
      g.log = function(a,b){g("log",[a,b])};
      // @ts-expect-error
      g.consent=function(a){g("consent",!arguments.length||a)};
      // @ts-expect-error
      g.identifyAccount=function(i,v){o='account';v=v||{};v.acctId=i;g(o,v)};
      // @ts-expect-error
      g.clearUserCookie=function(){};
      // @ts-expect-error
      g.setVars=function(n, p){g('setVars',[n,p]);};
      // @ts-expect-error
      g._w={};y='XMLHttpRequest';g._w[y]=m[y];y='fetch';g._w[y]=m[y];
      // @ts-expect-error
      if(m[y])m[y]=function(){return g._w[y].apply(this,arguments)};
      // @ts-expect-error
      g._v="1.3.0";
      // @ts-expect-error
  })(window,document,window['_fs_namespace'],'script','user');
  /* eslint-enable */

  // @ts-expect-error
  const fullStory: FullStoryApi = window.FSKibana;

  try {
    // This needs to be called syncronously to be sure that we populate the user ID soon enough to make sessions merging
    // across domains work
    if (!userId) return;
    // Do the hashing here to keep it at clear as possible in our source code that we do not send literal user IDs
    const hashedId = sha256(userId.toString());
    fullStory.identify(hashedId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[cloud.full_story] Could not call FS.identify due to error: ${e.toString()}`, e);
  }

  // Record an event that Kibana was opened so we can easily search for sessions that use Kibana
  fullStory.event('Loaded Kibana', {
    // `str` suffix is required, see docs: https://help.fullstory.com/hc/en-us/articles/360020623234
    kibana_version_str: packageInfo.version,
  });
};
