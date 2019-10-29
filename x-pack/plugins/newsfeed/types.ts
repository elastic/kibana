/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ApiItem {
  hash: string;
  expire_on: Date;
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  link_text: { [lang: string]: string };
  link_url: { [lang: string]: string };
  badge: { [lang: string]: string } | null;
  languages: string[] | null;
  image_url?: null; // not used phase 1
  publish_on?: null; // not used phase 1
}

export interface NewsfeedItem {
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
}
