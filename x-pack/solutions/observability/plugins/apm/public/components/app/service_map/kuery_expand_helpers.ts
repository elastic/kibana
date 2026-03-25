/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes a string for safe use inside a RegExp.
 */
function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns the kuery with all "service.name: ..." clauses removed.
 * Used as the "base" filters (environment, transaction type, etc.) for the smart cache:
 * we fetch once with base kuery only and filter the displayed subgraph by expanded services.
 */
export function getBaseKuery(kuery: string): string {
  if (!kuery || !kuery.trim()) {
    return '';
  }
  // Remove all " or service.name: "X"" / " or service.name: 'X'"
  let result = kuery.replace(/\s+or\s+service\.name\s*:\s*["'][^"']*["']/gi, '').trim();
  // Remove "service.name: "X" or " / "service.name: 'X' or "
  result = result.replace(/service\.name\s*:\s*["'][^"']*["']\s+or\s+/gi, '').trim();
  // Remove standalone "service.name: "X"" / "service.name: 'X'"
  result = result.replace(/^service\.name\s*:\s*["'][^"']*["']\s*$/gi, '').trim();
  // Clean up double " or " and normalize spaces
  result = result
    .replace(/\s+or\s+or\s+/gi, ' or ')
    .replace(/^\s+or\s+|\s+or\s+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return result;
}

/**
 * Returns the list of service names that appear in "service.name: ..." clauses in the kuery.
 * Used to determine which services are currently "expanded" (included via expand control).
 */
export function getExpandedServiceNamesFromKuery(kuery: string): string[] {
  if (!kuery || !kuery.trim()) {
    return [];
  }
  const names: string[] = [];
  // Match service.name: "X" or service.name: 'X' (double or single quoted)
  const regex = /service\.name\s*:\s*["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(kuery)) !== null) {
    names.push(match[1]);
  }
  return [...new Set(names)];
}

/**
 * Appends " or service.name: \"serviceName\"" to the kuery so that the map
 * includes connections for that service.
 */
export function addServiceToKuery(kuery: string, serviceName: string): string {
  const term = `service.name: "${serviceName.replace(/"/g, '\\"')}"`;
  const trimmed = (kuery ?? '').trim();
  return trimmed ? `${trimmed} or ${term}` : term;
}

/**
 * Removes one "service.name: \"serviceName\"" clause from the kuery (and any " or " around it).
 */
export function removeServiceFromKuery(kuery: string, serviceName: string): string {
  if (!kuery || !kuery.trim()) {
    return '';
  }
  const escaped = escapeForRegex(serviceName);
  // Remove " or service.name: "X"" or " or service.name: 'X'" (with optional surrounding whitespace)
  let result = kuery
    .replace(new RegExp(`\\s+or\\s+service\\.name\\s*:\\s*["']${escaped}["']`, 'gi'), '')
    .trim();
  // Remove "service.name: "X" or " or "service.name: 'X' or " at the start
  result = result.replace(
    new RegExp(`^service\\.name\\s*:\\s*["']${escaped}["']\\s+or\\s+`, 'gi'),
    ''
  );
  // Remove standalone "service.name: "X"" or "service.name: 'X'"
  result = result.replace(new RegExp(`^service\\.name\\s*:\\s*["']${escaped}["']\\s*$`, 'gi'), '');
  // Clean up double " or " or trailing/leading " or " and normalize spaces
  result = result
    .replace(/\s+or\s+or\s+/gi, ' or ')
    .replace(/^\s+or\s+|\s+or\s+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return result;
}
