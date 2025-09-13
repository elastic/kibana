# @kbn/wc-index-schema-builder

Schema building utilities for chat solution index structures. This package provides tools for constructing and managing index schemas specifically designed for chat and AI-powered search functionality.

## Overview

The `@kbn/wc-index-schema-builder` package contains utilities for building index schemas that optimize data structures for chat solutions and AI-powered search in Kibana.

## Package Details

- **Package Type**: Chat solutions utility
- **Location**: `x-pack/solutions/chat/packages`
- **Purpose**: Index schema construction for chat features

## Core Functions

### buildSchema()
Primary function for constructing index schemas optimized for chat and AI search functionality.

## Usage Examples

```typescript
import { buildSchema } from '@kbn/wc-index-schema-builder';

// Build optimized schema for chat search
const chatSchema = buildSchema({
  fields: ['content', 'metadata', 'timestamp'],
  optimizeFor: 'semantic_search'
});
```

## Integration

Used by chat solutions to create efficient index structures that support AI-powered search and content discovery.
