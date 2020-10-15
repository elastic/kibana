/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageFieldSegment {
  /** The field the segment was derived from */
  field: string;
  /** The segment's message */
  value: string;
  /** A list of highlighted substrings of the value */
  highlights: string[];
}
/** A segment of the log entry message that was derived from a string literal */
export interface InfraLogMessageConstantSegment {
  /** The segment's message */
  constant: string;
}

export type InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment;

/** A special built-in column that contains the log entry's timestamp */
export interface InfraLogEntryTimestampColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** The timestamp */
  timestamp: number;
}
/** A special built-in column that contains the log entry's constructed message */
export interface InfraLogEntryMessageColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** A list of the formatted log entry segments */
  message: InfraLogMessageSegment[];
}

/** A column that contains the value of a field of the log entry */
export interface InfraLogEntryFieldColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** The field name of the column */
  field: string;
  /** The value of the field in the log entry */
  value: string;
  /** A list of highlighted substrings of the value */
  highlights: string[];
}

/** A column of a log entry */
export type InfraLogEntryColumn =
  | InfraLogEntryTimestampColumn
  | InfraLogEntryMessageColumn
  | InfraLogEntryFieldColumn;

/** A representation of the log entry's position in the event stream */
export interface InfraTimeKey {
  /** The timestamp of the event that the log entry corresponds to */
  time: number;
  /** The tiebreaker that disambiguates events with the same timestamp */
  tiebreaker: number;
}

/** A log entry */
export interface InfraLogEntry {
  /** A unique representation of the log entry's position in the event stream */
  key: InfraTimeKey;
  /** The log entry's id */
  gid: string;
  /** The source id */
  source: string;
  /** The columns used for rendering the log entry */
  columns: InfraLogEntryColumn[];
}
