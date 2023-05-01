# Observability Shared

A plugin that contains components and utilities shared by all Observability plugins.

## Shared navigation

The Observability plugin maintains a navigation registry for Observability solutions, and exposes a shared page template component. Please refer to the docs in [the component directory](public/components/shared/page_template) for more information on registering your solution's navigation structure, and rendering the navigation via the shared component.

## A note on cyclical dependencies

Do not import any Observability plugins into this plugin. Only export shared stuff to other plugins.
