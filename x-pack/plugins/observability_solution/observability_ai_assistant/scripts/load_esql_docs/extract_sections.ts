/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import $, { AnyNode, Cheerio } from 'cheerio';

export function extractSections(cheerio: Cheerio<AnyNode>) {
  const sections: Array<{
    title: string;
    content: string;
  }> = [];
  cheerio.find('.section h3').each((index, element) => {
    let untilNextHeader = $(element).nextUntil('h3');

    if (untilNextHeader.length === 0) {
      untilNextHeader = $(element).parents('.titlepage').nextUntil('h3');
    }

    if (untilNextHeader.length === 0) {
      untilNextHeader = $(element).parents('.titlepage').nextAll();
    }

    const title = $(element).text().trim().replace('edit', '');

    untilNextHeader.find('table').remove();
    untilNextHeader.find('svg').remove();

    const text = untilNextHeader.text();

    const content = text.replaceAll(/([\n]\s*){2,}/g, '\n');

    sections.push({
      title: title === 'STATS ... BY' ? 'STATS' : title,
      content: `${title}\n\n${content}`,
    });
  });

  return sections;
}
