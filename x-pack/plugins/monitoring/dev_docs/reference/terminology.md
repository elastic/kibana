# Terminology

#### Internal collection

The process of collecting monitoring data handled by the stack components themselves. Each component is responsible for sending documents to elasticsearch directly.

#### Metricbeat collection

The process of collecting monitoring data using metricbeat. Each component exposes an endpoint that metricbeat queries using a module for that component. Metricbeat then sends the data to elasticsearch for all monitored components. 